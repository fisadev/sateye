from django.urls import path
from rest_framework import routers

from website.api import views

router = routers.SimpleRouter()
router.register(r'satellites', views.SatelliteViewSet, basename='Satellite')
router.register(r'dashboards', views.DashboardViewSet, basename='Dashboard')

urlpatterns = router.urls
urlpatterns += [
    path('predict_path/', views.predict_path),
    path('predict_passes/', views.predict_passes),
]
