"""Validation for handout section 5.4: delete containers and rebuild.

(The handout has no section 5.5; this covers the full 5.4 persistence check.)

Usage (from the repository root, on the Docker host)::

    python tests/validate_persist.py

The script drives the real Compose project through ``sudo docker compose``.
Evidence is written under ``docs/``:

  * every ``docker compose ps -a`` invocation is saved as a text file;
  * every counter verification is captured as a screenshot in ``docs/images/``;
  * every database query is saved as a text file.

It continues from the state left by ``tests/validate_restart.py`` (counter 0),
but also works on a freshly initialized named volume. The named volume is kept
throughout: the script never runs ``docker compose down -v``.

Set ``VALIDATION_DIR`` to override the evidence directory.
"""

import os
import sys

from common import (
    AppService,
    ValidationDriver,
    check,
    check_counter,
    check_no_services,
    check_services,
    click_expect,
    image_path,
    text_path,
    IMAGES_DIR,
)


def main():
    os.makedirs(IMAGES_DIR, exist_ok=True)

    with AppService() as app:
        # ----- 5.4.1 Increment to 7 and confirm the write in the database ---
        with ValidationDriver() as driver:
            driver.wait_for_counter(0)
            check(driver.read_counter(), 0, "5.4 prerequisite (5.3 end state)")

            for expected in range(1, 8):
                click_expect(driver, "increment", expected, f"5.4 +{expected}")
            driver.screenshot(image_path("5.4-01-value-7.png"))

        database_output = app.query_counter(text_path("5.4-02-db-before-rebuild.txt"))
        check_counter(database_output, 7, "5.4 database before rebuild = 7")

        # ----- 5.4.2 Save containers, delete them, save again ---------------
        before_down = app.ps(text_path("5.4-03-ps-before-down.txt"))
        check_services(before_down, "5.4 services before down")

        app.down()

        after_down = app.ps(text_path("5.4-04-ps-after-down.txt"))
        check_no_services(after_down, "5.4 services after down")

        # ----- 5.4.3 Rebuild and start --------------------------------------
        app.up()
        after_rebuild = app.ps(text_path("5.4-05-ps-after-rebuild.txt"))
        check_services(after_rebuild, "5.4 services after rebuild")

        # ----- 5.4.4 New incognito window still sees 7 -----------------------
        with ValidationDriver() as driver:
            try:
                driver.wait_for_counter(7)
            except:
                pass
            check(driver.read_counter(), 7, "5.4 after rebuild = 7")
            driver.screenshot(image_path("5.4-06-after-rebuild-7.png"))

            database_output = app.query_counter(
                text_path("5.4-07-db-after-rebuild.txt")
            )
            check_counter(database_output, 7, "5.4 database after rebuild = 7")

            # ----- 5.4.5 Decrement to 6, refresh and confirm in database ----
            click_expect(driver, "decrement", 6, "5.4 -1 = 6")
            driver.screenshot(image_path("5.4-08-value-6.png"))

            driver.refresh()
            driver.wait_for_counter(6)
            check(driver.read_counter(), 6, "5.4 refresh = 6")
            driver.screenshot(image_path("5.4-09-refresh-6.png"))

        database_output = app.query_counter(text_path("5.4-10-db-after-decrement.txt"))
        check_counter(database_output, 6, "5.4 database after decrement = 6")

    print("\nAll 5.4 persistence validation checks passed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"\nVALIDATION FAILED: {exc}", file=sys.stderr)
        raise
