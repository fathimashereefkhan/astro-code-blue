
from sqlalchemy import inspect, text
from database import engine

with engine.begin() as connection:

    columns = inspect(connection).get_columns("assessments")

    column_names = [column["name"] for column in columns]

    if "analysis" not in column_names:

        connection.execute(
            text("ALTER TABLE assessments ADD COLUMN analysis JSON")
        )

        print("Analysis column added successfully!")

    else:
        print("Analysis column already exists!")