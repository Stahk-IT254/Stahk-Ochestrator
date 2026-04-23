from django.core.management.base import BaseCommand
from django.db import connection
from django.conf import settings
import os
import psycopg2
from psycopg2 import sql


class Command(BaseCommand):
    help = 'Test database connection and display connection details'

    def add_arguments(self, parser):
        parser.add_argument(
            '--verbose',
            action='store_true',
            help='Show detailed connection information',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== Database Connection Test ===\n')
        )
        
        # Display current database configuration
        db_config = settings.DATABASES['default']
        self.stdout.write('Database Configuration:')
        self.stdout.write(f"  Engine: {db_config['ENGINE']}")
        self.stdout.write(f"  Name: {db_config['NAME']}")
        self.stdout.write(f"  User: {db_config['USER']}")
        self.stdout.write(f"  Host: {db_config['HOST']}")
        self.stdout.write(f"  Port: {db_config['PORT']}")
        self.stdout.write(f"  Password: {'*' * len(db_config['PASSWORD']) if db_config['PASSWORD'] else '(empty)'}")
        
        if options['verbose']:
            self.stdout.write('\nEnvironment Variables:')
            env_vars = ['DB_NAME', 'DB_USER', 'DB_PASSWORD', 'DB_HOST', 'DB_PORT']
            for var in env_vars:
                value = os.getenv(var, '(not set)')
                if var == 'DB_PASSWORD' and value != '(not set)':
                    value = '*' * len(value)
                self.stdout.write(f"  {var}: {value}")
        
        self.stdout.write('\n' + '='*50)
        
        # Test 1: Django ORM connection
        self.stdout.write('\n1. Testing Django ORM connection...')
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()
                self.stdout.write(
                    self.style.SUCCESS(f"✓ Django ORM connection successful!")
                )
                self.stdout.write(f"   Database version: {version[0]}")
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Django ORM connection failed: {e}")
            )
            return
        
        # Test 2: Direct psycopg2 connection
        self.stdout.write('\n2. Testing direct psycopg2 connection...')
        try:
            conn_params = {
                'host': db_config['HOST'],
                'port': db_config['PORT'],
                'database': db_config['NAME'],
                'user': db_config['USER'],
                'password': db_config['PASSWORD'],
            }
            
            # Add SSL mode for Supabase
            if 'supabase.com' in db_config['HOST']:
                conn_params['sslmode'] = 'require'
            
            conn = psycopg2.connect(**conn_params)
            cursor = conn.cursor()
            cursor.execute("SELECT current_database(), current_user, inet_server_addr();")
            result = cursor.fetchone()
            
            self.stdout.write(
                self.style.SUCCESS(f"✓ Direct psycopg2 connection successful!")
            )
            self.stdout.write(f"   Database: {result[0]}")
            self.stdout.write(f"   User: {result[1]}")
            self.stdout.write(f"   Server IP: {result[2]}")
            
            cursor.close()
            conn.close()
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Direct psycopg2 connection failed: {e}")
            )
        
        # Test 3: Test basic queries
        self.stdout.write('\n3. Testing basic database operations...')
        try:
            with connection.cursor() as cursor:
                # Test SELECT
                cursor.execute("SELECT 1 as test_value;")
                result = cursor.fetchone()
                self.stdout.write(f"   SELECT test: {result[0]}")
                
                # Test current timestamp
                cursor.execute("SELECT NOW();")
                timestamp = cursor.fetchone()
                self.stdout.write(f"   Current timestamp: {timestamp[0]}")
                
                # Test database info
                cursor.execute("""
                    SELECT 
                        current_database() as db_name,
                        current_user as db_user,
                        version() as db_version;
                """)
                info = cursor.fetchone()
                self.stdout.write(f"   Database name: {info[0]}")
                self.stdout.write(f"   Database user: {info[1]}")
                
            self.stdout.write(
                self.style.SUCCESS("✓ Basic database operations successful!")
            )
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Basic database operations failed: {e}")
            )
        
        # Test 4: Check Django migrations table
        self.stdout.write('\n4. Checking Django migrations...')
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'django_migrations'
                    );
                """)
                migrations_table_exists = cursor.fetchone()[0]
                
                if migrations_table_exists:
                    cursor.execute("SELECT COUNT(*) FROM django_migrations;")
                    migration_count = cursor.fetchone()[0]
                    self.stdout.write(
                        self.style.SUCCESS(f"✓ Django migrations table exists with {migration_count} migrations")
                    )
                else:
                    self.stdout.write(
                        self.style.WARNING("⚠ Django migrations table does not exist")
                    )
                    self.stdout.write("   Run 'python manage.py migrate' to create it")
                    
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f"✗ Error checking migrations: {e}")
            )
        
        self.stdout.write('\n' + '='*50)
        self.stdout.write(
            self.style.SUCCESS('\nDatabase connection test completed!')
        )