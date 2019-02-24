from setuptools import setup

setup(
    name='sateye',
    packages=['sateye'],
    include_package_data=True,
    install_requires=[
        'flask',
        'requests',
        'orbit-predictor',
        'munch',
    ],
)
