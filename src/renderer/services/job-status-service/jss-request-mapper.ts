import { get, omit, reduce } from "lodash";

import {
  BasicType,
  JobQuery,
  JSSServiceFields,
  JSSUpdateJobRequest,
  UpdateJobRequest,
} from "./types";

const isBasicType = (value: any): value is BasicType => {
  const notObject = typeof value !== "object";
  const isNull = value === null;
  const isDate = value instanceof Date;
  return notObject || isNull || isDate;
};

const SERVICE_FIELD_NAME = "serviceFields";

export default class JSSRequestMapper {
  public static map(
    job: UpdateJobRequest | JobQuery,
    isPatch = false
  ): JSSUpdateJobRequest {
    const nonServiceFields = omit(job, SERVICE_FIELD_NAME);
    const serviceFields = get(job, SERVICE_FIELD_NAME);
    const flattenedServiceFields: any = serviceFields
      ? JSSRequestMapper.flattenServiceFields(serviceFields, isPatch)
      : {};

    return {
      ...nonServiceFields,
      ...flattenedServiceFields,
    };
  }

  private static flattenServiceFields(
    rawServiceFields: JSSServiceFields,
    isPatch = false,
    updateKey = "service_fields",
    fields: JSSServiceFields = {}
  ): JSSServiceFields {
    if (typeof rawServiceFields !== "object") {
      return {
        ...fields,
        [updateKey]: rawServiceFields,
      };
    }

    return reduce(
      rawServiceFields,
      (accum: any, value: any, key: string) => {
        // Mongo doesn't support keys with dots in them
        const newKey = `${updateKey}.${key.replace(/\./g, "(dot)")}`;
        if (isBasicType(value) || !isPatch) {
          accum[newKey] = value;
        } else if (value instanceof Array) {
          accum = {
            ...accum,
            ...JSSRequestMapper.flattenList(value, newKey, isPatch),
          };
        } else {
          accum = {
            ...accum,
            ...JSSRequestMapper.flattenServiceFields(
              value,
              isPatch,
              newKey,
              accum
            ),
          };
        }

        return accum;
      },
      fields
    );
  }

  private static flattenList(
    rawList: any[],
    updateKey: string,
    isPatch = false
  ): JSSServiceFields {
    return rawList.reduce(
      (accum: JSSServiceFields, currentValue: any, i: number) => {
        return {
          ...accum,
          ...JSSRequestMapper.flattenServiceFields(
            currentValue,
            isPatch,
            `${updateKey}.${i}`
          ),
        };
      },
      {}
    );
  }
}
