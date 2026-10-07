import {
  normalizeDutchPostalCode,
  parsePostalAddressLookupResponse,
  type ServiceFormCapabilities,
} from '@/domeinen/service-form';

type CheckZipcode = (postalCode: string, houseNumber: number) => Promise<string>;

export function createPostalAddressLookup(
  checkZipcode: CheckZipcode,
): NonNullable<ServiceFormCapabilities['lookupPostalAddress']> {
  return async (input) => {
    const postalCode = normalizeDutchPostalCode(input.postalCode);
    const houseNumber = Number(input.houseNumber);
    if (!postalCode || !Number.isInteger(houseNumber)) {
      return null;
    }
    const response = await checkZipcode(postalCode.replace(' ', ''), houseNumber);
    return parsePostalAddressLookupResponse(response, input);
  };
}
