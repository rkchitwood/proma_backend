\echo 'delete and recreate proma db?'
\prompt 'return for yes or CTRL-C to cancel' input

DROP DATABASE proma;
CREATE DATABASE proma;

\connect proma

\i proma-schema.sql
-- \i proma-seed.sql

\echo 'delete and recreate proma_test db.?'
\prompt 'return for yes or CTRL-C to cancel' input

DROP DATABASE proma_test;
CREATE DATABASE proma_test;

\connect proma_test;

\i proma-schema.sql