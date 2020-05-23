import { singleton, injectable } from "tsyringe";
import Ajv from "ajv";
import Logger from "@/helpers/Logger";
import { ec } from "@/constants/logging";

@singleton()
@injectable()
export default class Validator {
  private ajv: Ajv.Ajv;
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    this.ajv = new Ajv({
      allErrors: true,
    });
  }

  public validateSchema(schema: any, data: any): boolean {
    const isValid = this.ajv.validate(schema, data);
    if (!isValid) {
      this.logger.error(ec.schema_validation_failed, {
        code: ec.schema_validation_failed,
        error: this.ajv.errorsText(),
      });
      return false;
    }
    return true;
  }
}
