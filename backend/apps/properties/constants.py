from django.db import models


class PropertyType(models.TextChoices):
    BUILDING = 'BUILDING', 'Immeuble'
    RESIDENCE = 'RESIDENCE', 'Résidence'
    COMMERCIAL = 'COMMERCIAL', 'Centre Commercial'
    VILLA = 'VILLA', 'Villa'
    LAND = 'LAND', 'Terrain'


class UnitType(models.TextChoices):
    STUDIO = 'STUDIO', 'Studio'
    APARTMENT_T1 = 'T1', 'Appartement T1'
    APARTMENT_T2 = 'T2', 'Appartement T2'
    APARTMENT_T3 = 'T3', 'Appartement T3'
    APARTMENT_T4 = 'T4', 'Appartement T4'
    APARTMENT_T5_PLUS = 'T5_PLUS', 'Appartement T5 ou plus'
    VILLA = 'VILLA', 'Villa'
    COMMERCIAL_SPACE = 'COMMERCIAL', 'Local Commercial'
    OFFICE = 'OFFICE', 'Bureau'
    PARKING = 'PARKING', 'Parking / Box'


class UnitStatus(models.TextChoices):
    VACANT = 'VACANT', 'Libre / Disponible'
    OCCUPIED = 'OCCUPIED', 'Occupé'
    MAINTENANCE = 'MAINTENANCE', 'En Travaux / Rénovation'
    RESERVED = 'RESERVED', 'Réservé'
