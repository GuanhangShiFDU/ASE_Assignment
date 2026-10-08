"""Validation for handout sections 5.1-5.3.

Usage (from the repository root, on the Docker host)::

    python tests/validate_restart.py

The script drives the real Compose project through ``sudo docker compose``.
Evidence is written under ``docs/``:

  * every ``docker compose ps -a`` invocation is saved as a text file;
  * every counter verification is captured as a screenshot in ``docs/images/``.

Set ``VALIDATION_DIR`` to override the evidence directory.
"""

import os
import sys

from common import (
    AppService,
    ValidationDriver,
    check,
    check_services,
    click_expect,
    image_path,
    text_path,
    IMAGES_DIR,
)


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)

    # ----- 5.1 Start from a clean environment ------------------------------
    with AppService() as app:
        ps_output = app.ps(text_path("5.1-compose-ps.txt"))
        check_services(ps_output, "5.1 services")

        with ValidationDriver() as driver:
            driver.wait_for_counter(0)
            check(driver.read_counter(), 0, "5.1 initial value")
            driver.screenshot(image_path("5.1-initial-0.png"))

            # ----- 5.2 Function and database writes ------------------------
            click_expect(driver, "increment", 1, "5.2 +1")
            click_expect(driver, "increment", 2, "5.2 +2")
            click_expect(driver, "increment", 3, "5.2 +3")
            click_expect(driver, "decrement", 2, "5.2 +3 -1 = 2")
            driver.screenshot(image_path("5.2-01-value-2.png"))

            driver.refresh()
            driver.wait_for_counter(2)
            check(driver.read_counter(), 2, "5.2 refresh = 2")
            driver.screenshot(image_path("5.2-02-refresh-2.png"))

            with ValidationDriver() as second:
                second.wait_for_counter(2)
                check(second.read_counter(), 2, "5.2 second browser = 2")
                second.screenshot(image_path("5.2-03-second-browser-2.png"))

            click_expect(driver, "decrement", 1, "5.2 -1")
            click_expect(driver, "decrement", 0, "5.2 -2")
            click_expect(driver, "decrement", -1, "5.2 -3 = -1")
            driver.screenshot(image_path("5.2-04-value-minus1.png"))

            driver.refresh()
            driver.wait_for_counter(-1)
            check(driver.read_counter(), -1, "5.2 refresh = -1")
            driver.screenshot(image_path("5.2-05-refresh-minus1.png"))

        # ----- 5.3 Verify service restart ----------------------------------
        app.restart()
        ps_output = app.ps(text_path("5.3-compose-ps-after-restart.txt"))
        check_services(ps_output, "5.3 services after restart")

        with ValidationDriver() as driver:
            driver.wait_for_counter(-1)
            check(driver.read_counter(), -1, "5.3 after restart = -1")
            driver.screenshot(image_path("5.3-01-after-restart-minus1.png"))

            click_expect(driver, "increment", 0, "5.3 +1 after restart = 0")
            driver.screenshot(image_path("5.3-02-after-restart-0.png"))

    print("\nAll 5.1-5.3 validation checks passed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nVALIDATION FAILED: {exc}", file=sys.stderr)
        raise
