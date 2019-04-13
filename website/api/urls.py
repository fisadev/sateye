from django.urls import path
from rest_framework import routers

from website.api import views

router = routers.SimpleRouter()
router.register(r'satellites/(?P<satellite_id>\d+)/tles', views.TLEViewSet, basename='TLE')
router.register(r'satellites', views.SatelliteViewSet, basename='Satellite')
router.register(r'dashboards', views.DashboardViewSet, basename='Dashboard')
router.register(r'locations', views.LocationViewSet, basename='Location')

urlpatterns = router.urls
urlpatterns += [
    path('satellites/<int:satellite_id>/predict_path/', views.predict_path),
    path('predict_passes/', views.predict_passes),
]
