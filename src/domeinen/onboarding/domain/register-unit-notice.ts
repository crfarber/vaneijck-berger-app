let claimed = false;

export function claimRegisterUnitNotice(): boolean {
  if (claimed) {
    return false;
  }
  claimed = true;
  return true;
}

export function clearRegisterUnitNotice(): void {
  claimed = false;
}
