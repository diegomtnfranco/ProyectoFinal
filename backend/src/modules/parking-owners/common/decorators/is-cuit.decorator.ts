 import { registerDecorator,ValidationOptions,ValidationArguments } from "class-validator";


 export function IsCUIT(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isCUIT',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          
          // Eliminar guiones si los tiene
          const cleanCUIT = value.replace(/-/g, '');
          
          // Debe tener 11 dígitos
          if (!/^\d{11}$/.test(cleanCUIT)) return false;
          
          // Validar dígito verificador
          return validateCUITChecksum(cleanCUIT);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} debe ser un CUIT/CUIL válido (formato: XX-XXXXXXXX-X o 11 dígitos)`;
        },
      },
    });
  };
}


function validateCUITChecksum(cuit: string): boolean {
  const multipliers = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cuit[i]) * multipliers[i];
  }
  
  const remainder = sum % 11;
  const checkDigit = remainder === 0 ? 0 : remainder === 1 ? 9 : 11 - remainder;
  
  return checkDigit === parseInt(cuit[10]);
}