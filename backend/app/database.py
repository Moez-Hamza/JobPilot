import psycopg2
import psycopg2.extras
from psycopg2.pool import ThreadedConnectionPool
from app.config import settings
from contextlib import contextmanager
from typing import Optional

_pool: Optional[ThreadedConnectionPool] = None


def init_pool():
    global _pool
    _pool = ThreadedConnectionPool(
        minconn=1,
        maxconn=10,
        dsn=settings.DATABASE_URL,
        cursor_factory=psycopg2.extras.RealDictCursor,
    )


@contextmanager
def get_db():
    global _pool
    if _pool is None:
        init_pool()
    conn = _pool.getconn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        _pool.putconn(conn)
