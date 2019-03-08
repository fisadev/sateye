from rest_framework import routers

from website.api import views

router = routers.SimpleRouter()
router.register(r'satellites', views.SatelliteViewSet)
router.register(r'location', views.LocationViewSet)

urlpatterns = router.urls
