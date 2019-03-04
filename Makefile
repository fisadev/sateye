run:
	./manage.py runserver

shell:
	./manage.py shell

syncdb:
	./manage.py makemigrations website
	./manage.py migrate
	./manage.py dumpdata website --indent 2 > website/fixtures/initial_data.json
	rm -f ./db.sqlite3
	rm -rf ./website/migrations/*
	./manage.py makemigrations website
	./manage.py migrate
	echo "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@admin.com', 'pass')" | ./manage.py shell
	./manage.py loaddata website/fixtures/initial_data.json
