# Renta Clara Gestion

Ayúdame a crear una app con IA usando Lovable AI y Claude. Me interesa armar una aplicación de administración de propiedades para inmobiliarias, quiero que sea únicamente de administración, no de comercialización. Se me ocurre que tendríamos que poder ingresar Propietarios, Inquilinos, Propiedades y Contratos. Me gustaría que haya un panel para la inmobiliaria donde cargar todos los datos anteriores: propietarios, inquilinos, propiedades y contratos.

Un panel para el inquilino con usuario y contraseña, que tenga asociado su contrato y pueda ver su recibo con los detalles de pago del mes en curso, que pueda adjuntar los comprobantes de pago realizados y pueda generar un reclamo si tiene algún problema en el inmueble. Una vez realizado el pago, pueda visualizar la factura de alquiler emitida por el propietario.

En el panel de propietario con usuario y contraseña me gustaría que pueda visualizar la rendición del mes, que es el pago del alquiler menos la administración que cobra la inmobiliaria por administrar, y pueda adjuntar la factura del alquiler para que luego la visualice el inquilino.

Los pagos se registran manualmente: el inquilino sube el comprobante de pago y la inmobiliaria lo verifica y confirma el pago en el sistema. La IA (Claude) debe leer los comprobantes de pago adjuntos para extraer y registrar automáticamente monto, fecha y método de pago, y debe ayudar a resumir y gestionar los reclamos del inmueble, sugiriendo prioridad y redactando respuestas para la inmobiliaria.

Además, me gustaría tener un flujo de caja para tener control mensual de lo que ingresa y de lo que se gasta. Cada vez que se alquile una propiedad, que me consulte si se pagaron honorarios, qué monto se pagó y en cuántas cuotas, para que eso pase directo a la caja. Los honorarios mensuales por administración, una vez que aceptamos el comprobante de pago, que se sumen también automáticamente a la caja. Y además una opción manual para ingresar gastos y algún ingreso extra por fuera de los alquileres, por ejemplo alguna venta, tasación, etc.

Usar Lovable Cloud como base de datos (Postgres sobre Supabase), con la base de datos visible desde More → Database, ya que quiero acceder y ver los datos sin necesidad de entrar al asistente.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/75635f78-c400-400c-83a5-6e965bcd68ef).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
