from dataclasses import dataclass
from dataclasses import KW_ONLY

from databases import Database
from typegraph.materializers.base import Materializer
from typegraph.materializers.base import Runtime
from typegraph.types import typedefs as t

create_table = """
CREATE TABLE IF NOT EXISTS {table_name} (
  id integer NOT NULL,
  person_name character varying(40) NOT NULL,
  updated_date date,
  CONSTRAINT person_pkey PRIMARY KEY (id)
);
"""

list_tables = """
SELECT * FROM pg_catalog.pg_tables
"""

"""
CREATE TABLE products (
    product_no integer,
    name text,
    price numeric
);
DROP TABLE my_first_table;
ALTER TABLE products RENAME COLUMN product_no TO product_number;
ALTER TABLE products RENAME TO items;

ALTER TABLE products ADD COLUMN description text;
ALTER TABLE products ALTER COLUMN price TYPE numeric(10,2);
ALTER TABLE products DROP COLUMN description;

CREATE TABLE products (
    product_no integer,
    name text,
    price numeric DEFAULT 9.99
    product_no integer DEFAULT nextval('products_product_no_seq'),
    product_no SERIAL,
);
ALTER TABLE products ALTER COLUMN price SET DEFAULT 7.77;
ALTER TABLE products ALTER COLUMN price DROP DEFAULT;

CREATE TABLE products (
    product_no integer,
    name text,
    price numeric CONSTRAINT positive_price CHECK (price > 0)
);
ALTER TABLE products ADD CONSTRAINT some_name CHECK (name <> '');
ALTER TABLE products DROP CONSTRAINT some_name;

CREATE TABLE products (
    product_no integer NOT NULL,
    name text NOT NULL,
    price numeric
);
ALTER TABLE products ALTER COLUMN product_no SET NOT NULL;
ALTER TABLE products ALTER COLUMN product_no DROP NOT NULL;

CREATE TABLE example (
    a integer,
    b integer,
    c integer,
    UNIQUE (a, c)
);
ALTER TABLE products ADD CONSTRAINT some_name UNIQUE (product_no);
ALTER TABLE products DROP CONSTRAINT some_name;

CREATE TABLE example (
    a integer,
    b integer,
    c integer,
    PRIMARY KEY (a, c)
);
ALTER TABLE table_name ADD CONSTRAINT constraint_name PRIMARY KEY (column_1, column_2);
ALTER TABLE products DROP CONSTRAINT constraint_name;

CREATE TABLE t1 (
  a integer PRIMARY KEY,
  b integer,
  c integer,
  FOREIGN KEY (b, c) REFERENCES other_table (c1, c2) ON DELETE RESTRICT ON DELETE CASCADE
);
ALTER TABLE products ADD CONSTRAINT distfk FOREIGN KEY (product_group_id) REFERENCES product_groups;
ALTER TABLE products DROP CONSTRAINT distfk;


ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

CREATE ROLE alice;
DROP ROLE IF EXISTS bob;

CREATE POLICY account_managers ON accounts TO managers USING (manager = current_user);
CREATE POLICY user_sel_policy ON users
    FOR SELECT
    USING (true);
CREATE POLICY user_mod_policy ON users
    USING (user_name = current_user);
-- Create policies
-- Administrator can see all rows and add any rows
CREATE POLICY admin_all ON passwd TO admin USING (true) WITH CHECK (true);
-- Normal users can view all rows
CREATE POLICY all_view ON passwd FOR SELECT USING (true);
-- Normal users can update their own records, but
-- limit which shells a normal user is allowed to set
CREATE POLICY user_mod ON passwd FOR UPDATE
  USING (current_user = user_name)
  WITH CHECK (
    current_user = user_name AND
    shell IN ('/bin/bash','/bin/sh','/bin/dash','/bin/zsh','/bin/tcsh')
  );

-- Allow admin all normal rights
GRANT SELECT, INSERT, UPDATE, DELETE ON passwd TO admin;
-- Users only get select access on public columns
GRANT SELECT
  (user_name, uid, gid, real_name, home_phone, extra_info, home_dir, shell)
  ON passwd TO public;
-- Allow users to update certain columns
GRANT UPDATE
  (pwhash, real_name, home_phone, extra_info, shell)
  ON passwd TO public;



- [x] table management
- [x] column management
- [x] default value
- [ ] generated columns
- contraints
    - [x] check
    - [x] not-null
    - [x] unique
    - [x] primary
    - [x] foreign
    - [ ] exclusion
- renames
    - [ ] table
    - [ ] column
- [x] row level security
- [ ] triggers


"""


class SQLTarget:
    def __init__(self, connection) -> None:
        super().__init__()
        self.db = Database(connection)

    async def query(self, query, **kwargs):
        async with self.db:
            res = await self.db.fetch_all(query=query, values=kwargs)
            return [r._row for r in res]

    async def list_tables(self):
        return await self.query(list_tables)


async def postgraphile(connection):

    async with Database(connection) as db:

        async with db.transaction():

            query = """
            CREATE TABLE HighScores (id INTEGER PRIMARY KEY, name VARCHAR(100), score INTEGER)
            """
            await db.execute(query=query)


######################


@dataclass(eq=True, frozen=True)
class PostgresFunMat(Materializer):
    name: str
    _: KW_ONLY
    materializer_name: str = "postgres_fun"


@dataclass(eq=True, frozen=True)
class PostgresQueryMat(Materializer):
    query: str
    _: KW_ONLY
    materializer_name: str = "postgres_query"


@dataclass(eq=True, frozen=True)
class PostgresRuntime(Runtime):
    connection_string: str
    _: KW_ONLY
    runtime_name = "postgres"

    def fun(self, name, inp, out):
        return t.func(inp, out, PostgresFunMat(self, name))

    def query(self, name, inp, out):
        return t.func(inp, out, PostgresQueryMat(self, name))
