#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -o errexit

echo "==> [1/4] Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "==> [2/4] Collecting static files with WhiteNoise..."
python manage.py collectstatic --no-input

echo "==> [3/4] Running database migrations..."
python manage.py migrate --no-input

echo "==> [4/4] Checking demo data initialization..."
if [ "$SEED_DEMO_DATA" = "true" ] || [ "$SEED_DEMO_DATA" = "True" ] || [ "$SEED_DEMO_DATA" = "1" ]; then
    echo "==> Seeding initial demo data..."
    python manage.py seed_demo_data
fi

echo "==> Build completed successfully!"
