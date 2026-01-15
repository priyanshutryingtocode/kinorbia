/* eslint-disable no-var */

declare global {
  var mongoose: {
    conn: any;
    promise: any;
  } | undefined;
}

export {};