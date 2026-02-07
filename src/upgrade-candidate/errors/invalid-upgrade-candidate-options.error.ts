export class InvalidUpgradeCandidateOptionsError extends Error {
  readonly optionName: string;

  constructor(optionName: string, message: string) {
    super(`Invalid upgrade candidate option '${optionName}': ${message}`);
    this.name = 'InvalidUpgradeCandidateOptionsError';
    this.optionName = optionName;
    Object.setPrototypeOf(this, InvalidUpgradeCandidateOptionsError.prototype);
  }
}
