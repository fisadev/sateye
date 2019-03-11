from django.urls import path
from rest_framework import routers

from website.api import views

router = routers.SimpleRouter()
router.register(r'satellites/(?P<satellite_id>\d+)/tles', views.TLEViewSet, basename='TLE')
router.register(r'satellites', views.SatelliteViewSet)
router.register(r'locations', views.LocationViewSet)

urlpatterns = router.urls
urlpatterns += [
    path('satellites/<satellite_id>/predict_path/', views.predict_path),
]
