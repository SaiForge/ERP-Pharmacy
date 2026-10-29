"""add user phone and field constraints

Revision ID: 002_field_constraints
Revises: 001_initial
Create Date: 2026-10-29 10:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '002_field_constraints'
down_revision: Union[str, None] = '001_initial'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add phone column to users table
    op.add_column('users', sa.Column('phone', sa.String(length=10), nullable=True))


def downgrade() -> None:
    op.drop_column('users', 'phone')

