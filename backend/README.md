<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

# ParkingAPI

1. Clonar proyecto

2. ```npm install ```

3. Creas ```.env``` tomando de referencia el  
```
.env.template
```

4. Descargar Docker Desktop ```https://www.docker.com/get-started/```

5. Descargar imagen de postgres ```docker pull postgres:14.3```

6. Levantar la BD
```
docker-compose up -d
```
7. npm run start:dev

# Instalaciones útiles

1. Postman ```https://www.postman.com/downloads/```
2. TablePlus para gestar la DB ```https://tableplus.com/``` 

# Testing automatizado

## Comandos recomendados

Ejecutar toda la suite unitaria y de integración:

```bash
npm test -- --runInBand --coverage
```

Ejecutar solo los tests E2E:

```bash
npm run test:e2e
```

Ejecutar una selección rápida durante el desarrollo:

```bash
npm test -- --runInBand
```

## Estado actual de los tests

Se han implementado tests automatizados para los módulos principales del backend, con enfoque en reglas de negocio, permisos y flujos críticos.

### Módulos cubiertos

- Auth: login, registro, verificación de email y obtención de perfil.
- Occupancy: check-in, check-out, ocupaciones activas, historial y flujos anónimos.
- Reservations: creación, confirmación, cancelación y cambio de espacio.
- Parking-lots: creación, consulta, disponibilidad, actualización y control por propietario/empleado.
- Spaces: creación, actualización de estado, reactivación y consulta.
- Parking-owners: creación, aprobación y gestión.
- Rates: creación, consulta, tarifa aplicable y actualización.
- Websocket: emisión de eventos de ocupación y disponibilidad.

### Qué se valida

- Delegación correcta de los controladores a los servicios.
- Reglas de negocio y validaciones de acceso.
- Casos exitosos y de error para los flujos más críticos.
- Integración básica de auth y occupancy sin depender de una base de datos real.

### Cobertura actual

La última ejecución reportó:

- Statements: 25.51%
- Branches: 25.71%
- Functions: 11.52%
- Lines: 25.49%

Este porcentaje irá creciendo a medida que se agreguen más tests de servicios y controladores para los módulos restantes.