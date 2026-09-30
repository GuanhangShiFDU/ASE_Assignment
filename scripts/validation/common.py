import os
import shlex
import subprocess
import time
from typing import Literal

from selenium import webdriver
import selenium.webdriver.firefox.options
from selenium.webdriver.support.wait import WebDriverWait

APP_URL = os.environ.get("APP_URL") or \
    'http://localhost:8080'

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
EVIDENCE_DIR = os.path.abspath(
    os.environ.get("VALIDATION_DIR") or os.path.join(REPO_ROOT, "docs", "images")
)
IMAGES_DIR = EVIDENCE_DIR


class AppService():
    """Drives the Compose project on the local Docker host via `sudo docker compose`."""

    def __init__(self):
        self.compose = ['sudo', 'docker', 'compose']

    def _run(self, *args, check=True, capture=False):
        cmd = [*self.compose, *args]
        print("$", " ".join(cmd), flush=True)
        return subprocess.run(
            cmd,
            cwd=REPO_ROOT,
            check=check,
            text=True,
            capture_output=capture,
        )

    def prepare_env(self):
        """Honor the handout's `cp .env.example .env` step when an example exists."""
        example = os.path.join(REPO_ROOT, ".env.example")
        env_file = os.path.join(REPO_ROOT, ".env")
        if os.path.exists(example) and not os.path.exists(env_file):
            with open(example) as src, open(env_file, "w") as dst:
                dst.write(src.read())
            print("created .env from .env.example")

    def config(self):
        self._run('config', '-q')

    def up(self, build=True):
        args = ['up', '-d', '--wait']
        if build:
            args.append('--build')
        self._run(*args)

    def down(self):
        self._run('down')

    def restart(self):
        self._run('restart')

    def ps(self, output_path=None):
        """Run `docker compose ps -a` and save the output to a text file."""
        if output_path is None:
            output_path = os.path.join(EVIDENCE_DIR, 'docker-compose-ps.txt')
        result = self._run('ps', '-a', capture=True)
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        with open(output_path, 'w') as handle:
            handle.write('$ ' + ' '.join(self.compose) + ' ps -a\n')
            handle.write(result.stdout)
            if result.stderr:
                handle.write(result.stderr)
        return result.stdout

    def db_query(self, sql, output_path=None, database=None):
        """Run SQL inside the `db` container and (optionally) save the result."""
        # The root password lives inside the container at /run/secrets/mysql_root.
        shell = (
            'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"'
            f" -B -e {shlex.quote(sql)}"
        )
        result = self._run('exec', '-T', 'db', 'sh', '-c', shell, capture=True)
        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w') as handle:
                handle.write(f"-- SQL: {sql}\n")
                handle.write(result.stdout)
                if result.stderr:
                    handle.write(result.stderr)
        return result.stdout

    def query_counter(self, output_path=None, database=None):
        """Return the current `counting.cnt` value as the database sees it."""
        return self.db_query(
            "SELECT value FROM counter;", output_path, database
        )

    def __enter__(self):
        # Section 5.1: configure, build and start the whole application.
        self.prepare_env()
        self.config()
        self.up()
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        # Tear down containers but keep the named volume (no `-v`).
        self.down()


class ValidationDriver():
    def __init__(self, timeout: int = 15, load_retries: int = 5):
        self.timeout = timeout
        self.load_retries = load_retries
        options = selenium.webdriver.firefox.options.Options()
        options.add_argument("--headless")
        self.driver = webdriver.Firefox(options=options)

        self.load()

    def __enter__(self):
        return self

    def load(self):
        """Open the app, retrying while the stack is still coming back up."""
        last_error: Exception | None = None
        for _ in range(self.load_retries):
            try:
                self.driver.get(APP_URL)
                self._wait_till_page_loaded()
                self.wait_ready()
                return
            except Exception as exc:
                last_error = exc
                time.sleep(2)
        assert last_error is not None
        raise last_error

    def _wait_till_page_loaded(self):
        wait = WebDriverWait(self.driver, self.timeout)
        wait.until(lambda d: d.find_element("id", "increment"))
        del wait

    def wait_ready(self):
        """Wait until the page reports that backend and database are connected."""
        wait = WebDriverWait(self.driver, self.timeout)
        wait.until(
            lambda d: "ready" in (
                d.find_element("id", "status_bar").get_attribute("class") or ""
            )
        )
        del wait

    def refresh(self):
        self.driver.refresh()
        self._wait_till_page_loaded()
        self.wait_ready()

    def wait_for_counter(self, expected: int):
        wait = WebDriverWait(self.driver, self.timeout)
        wait.until(lambda d: self.read_counter() == expected)
        del wait

    def __exit__(self, exc_type, exc_value, traceback):
        self.driver.quit()

    def click(self, button_id: Literal['increment', 'decrement']):
        button = self.driver.find_element("id", button_id)
        button.click()
        self.driver.implicitly_wait(1)

    def read_counter(self) -> int:
        counter = self.driver.find_element("id", "count")
        return int(counter.text.strip())

    def screenshot(self, filename: str):
        directory = os.path.dirname(filename)
        if directory:
            os.makedirs(directory, exist_ok=True)
        self.driver.save_screenshot(filename)


def image_path(name: str) -> str:
    return os.path.join(IMAGES_DIR, name)


def text_path(name: str) -> str:
    return os.path.join(EVIDENCE_DIR, name)


def check(actual, expected, label: str):
    ok = actual == expected
    print(f"[{'PASS' if ok else 'FAIL'}] {label}: expected {expected}, got {actual}")
    if not ok:
        raise AssertionError(f"{label}: expected {expected}, got {actual}")


def click_expect(driver, button: str, expected: int, label: str):
    driver.click(button)
    driver.wait_for_counter(expected)
    check(driver.read_counter(), expected, label)


def check_services(ps_output: str, label: str):
    for service in ("frontend", "backend", "db"):
        if service not in ps_output:
            raise AssertionError(
                f"{label}: service {service!r} missing from `docker compose ps -a`"
            )
    print(f"[PASS] {label}: frontend, backend and db present")


def check_no_services(ps_output: str, label: str):
    for service in ("frontend", "backend", "db"):
        if service in ps_output:
            raise AssertionError(
                f"{label}: service {service!r} still present in `docker compose ps -a`"
            )
    print(f"[PASS] {label}: no project containers remain")


def parse_counter(db_output: str) -> int:
    """Extract the counter value from `mysql -B` query output."""
    for line in reversed(db_output.splitlines()):
        value = line.strip()
        if value and value.lstrip('-').isdigit():
            return int(value)
    raise AssertionError(f"no counter value found in database output: {db_output!r}")


def check_counter(database_output: str, expected: int, label: str):
    check(parse_counter(database_output), expected, label)
