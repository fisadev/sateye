dev_install:
	pip install --editable .

run:
	env FLASK_APP=sateye FLASK_DEBUG=true flask run
