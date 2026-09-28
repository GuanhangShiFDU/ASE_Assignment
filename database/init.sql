-- The official MySQL image executes this file on first initialization.
-- Re-running it must not reset an existing counter.
CREATE TABLE IF NOT EXISTS counter (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    value INT NOT NULL DEFAULT 0,
    CONSTRAINT single_counter CHECK (id = 1)
);

INSERT INTO counter (id, value) VALUES (1, 0)
ON DUPLICATE KEY UPDATE id = 1;

