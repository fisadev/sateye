run:
	./manage.py runserver

shell:
	./manage.py shell

new_devel_db:
	rm -f ./db.sqlite3
	rm -rf ./website/migrations/*
	./manage.py makemigrations website
	./manage.py migrate
	echo "from django.contrib.auth.models import User; User.objects.create_superuser('admin', 'admin@admin.com', 'pass')" | ./manage.py shell
	./manage.py loaddata website/fixtures/initial_data.json

post_sample_configs:
	http patch "http://localhost:8000/api/dashboards/1/" config:=@./devel_assets/sample_dashboard_config.json
	http patch "http://localhost:8000/api/dashboards/2/" config:=@./devel_assets/satellogic_dashboard_config.json
	http patch "http://localhost:8000/api/dashboards/3/" config:=@./devel_assets/starlink_dashboard_config.json
