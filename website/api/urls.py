from django.urls import path
from rest_framework import routers

from website.api import views

router = routers.SimpleRouter()
router.register(r'satellites', views.SatelliteViewSet)
router.register(r'location', views.LocationViewSet)

urlpatterns = router.urls
urlpatterns += [
    path('satellite/<satellite_id>/predict_path/', views.predict_path),
]
