import { describe, expect, it, vi } from 'vitest';
import { createPostalAddressLookup } from './postal-address-lookup';

describe('postal address lookup adapter', () => {
  it('calls the allocations API with normalized input and returns a structured address', async () => {
    const checkZipcode = vi.fn(async () => 'Dorpsstraat 1, 1234 AB Voorbeeld');
    const lookup = createPostalAddressLookup(checkZipcode);

    await expect(
      lookup({ postalCode: '1234 ab', houseNumber: '1', houseNumberAddition: '' }),
    ).resolves.toMatchObject({
      street: 'Dorpsstraat',
      houseNumber: '1',
      postalCode: '1234 AB',
      city: 'Voorbeeld',
    });
    expect(checkZipcode).toHaveBeenCalledWith('1234AB', 1);
  });

  it('does not call the API for incomplete input', async () => {
    const checkZipcode = vi.fn(async () => 'unused');
    const lookup = createPostalAddressLookup(checkZipcode);

    await expect(
      lookup({ postalCode: '123', houseNumber: 'one', houseNumberAddition: '' }),
    ).resolves.toBeNull();
    expect(checkZipcode).not.toHaveBeenCalled();
  });
});
