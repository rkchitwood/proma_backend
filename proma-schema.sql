CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE
        CHECK (position('@' IN email) > 1),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password TEXT NOT NULL,
    is_pm BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE boards (
    id SERIAL PRIMARY KEY,
    title VARCHAR(35) NOT NULL
);

CREATE TABLE boards_users (
    board_id INTEGER NOT NULL 
        REFERENCES boards ON DELETE CASCADE,
    user_id INTEGER NOT NULL
        REFERENCES users ON DELETE CASCADE,
    PRIMARY KEY (board_id, user_id)
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(35) NOT NULL,
    priority INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
    stage TEXT NOT NULL DEFAULT 'pending' CHECK (stage IN ('pending', 'in_progress', 'complete')),
    board_id INTEGER NOT NULL 
        REFERENCES boards ON DELETE CASCADE
);

CREATE TABLE projects_users (
    project_id INTEGER NOT NULL 
        REFERENCES projects ON DELETE CASCADE,
    user_id INTEGER NOT NULL
        REFERENCES users ON DELETE CASCADE,
    PRIMARY KEY (project_id, user_id)
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

INSERT INTO categories (name) VALUES
    ('internal_meeting'),
    ('external_meeting'),
    ('data_entry'),
    ('pulling_data'),
    ('research'),
    ('outreach'),
    ('preparation'),
    ('development'),
    ('review'),
    ('analytics'),
    ('other'),
    ('available');

CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    project_id INTEGER NOT NULL
        REFERENCES projects ON DELETE CASCADE,
    user_id INTEGER NOT NULL
        REFERENCES users ON DELETE CASCADE,
    start_datetime TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_datetime TIMESTAMPTZ,
    category_id INTEGER NOT NULL
        REFERENCES categories(id),
    comment TEXT,
    CHECK (end_datetime IS NULL OR start_datetime <= end_datetime)
);