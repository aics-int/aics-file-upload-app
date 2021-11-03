import { get, values, forOwn, isPlainObject } from "lodash";

import { JSSJob } from "./types";

const SERVICE_FIELD_NAME = "serviceFields";

export default class JSSResponseMapper {
  public static map(job: JSSJob): JSSJob {
    const serviceFields = get(job, SERVICE_FIELD_NAME);
    if (!serviceFields) {
      return job;
    }
    return {
      ...job,
      [SERVICE_FIELD_NAME]: JSSResponseMapper.expandArrayLikeDictionariesToArrays(
        serviceFields
      ),
    };
  }

  // As a result of how we can update jobs in JSS the best way to allow actual patches of data is to allow
  // arrays to be represented as dictionaries (indexes as key)
  private static expandArrayLikeDictionariesToArrays(
    rawServiceField: any
  ): any {
    if (!rawServiceField || !isPlainObject(rawServiceField)) {
      return rawServiceField;
    }
    const result: { [key: string]: any } = {};
    forOwn(rawServiceField, (value: any, key: string) => {
      // Replace occurrences of (dot) with actual dots in keys
      const convertedKey = key.replace(/\(dot\)/g, ".");
      result[convertedKey] = JSSResponseMapper.expandDictionaryIfArrayLike(
        value
      );
    });
    return result;
  }

  // If a dictionary seems to be array like then convert it into an array
  private static expandDictionaryIfArrayLike(value: any): any {
    const convertedValue = JSSResponseMapper.expandArrayLikeDictionariesToArrays(
      value
    );
    if (value && isPlainObject(value)) {
      const keysAreIndexes = Object.keys(value)
        .sort()
        .every((value, index) => value === `${index}`);
      // If object looks like it was an array pivoted into a dictionary, expand it out to an array again
      if (keysAreIndexes) {
        return values(convertedValue);
      }
    }
    return convertedValue;
  }
}
