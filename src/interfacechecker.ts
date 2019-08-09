
import { ServerConfig, ServerConfig_AccessOptions, ServerConfig_AuthAccountsValue } from "./server-config";

export function checkInterface() {

}
function or<A, B>(af: (a) => a is A, bf: (b) => b is B) {
  return (item): item is A | B => af(item) || bf(item);
}
const checkNever = (a): a is never => typeof a === "undefined";
const checkNull = (a): a is null => a === null;
const checkString = (a): a is string => typeof a === "string";
const checkStringEnum = <T extends string>(...values: T[]) => ((a): a is T => typeof a === "string" && values.indexOf(a as T) !== -1)
const checkBoolean = (a): a is boolean => typeof a === "boolean";
const checkBooleanTrue = (a): a is true => typeof a === "boolean" && a === true;
const checkBooleanFalse = (a): a is false => typeof a === "boolean" && a === false;
const checkNumber = (a): a is number => typeof a === "number";
function checkArray<T>(checker: (b) => b is T) {
  return (a): a is T[] => typeof a === "object" && Array.isArray(a) && a.every(b => checker(b));
}

function checkRecord<K extends string | number | symbol, T>(keychecker: (b) => b is K, checker: (b) => b is T) {
  return (a): a is Record<K, T> => {
    return typeof a === "object" && Object.keys(a).every(k => checker(a[k]));
  };
}

function checkObject<T extends {} = unknown>(
  checkermap: { [K in keyof T]-?: ((b) => b is T[K]) },
  optionalcheckermap: { [K in keyof T]?: ((b) => b is T[K]) } = {}) {
  return (a): a is T => {
    if (typeof a !== "object") return false;
    const keys = Object.keys(a);
    const required = Object.keys(checkermap);
    //make sure every key is either in required or optional
    //and every key in required is actually present
    return keys.every((k): boolean => {
      return !!checkermap[k] && checkermap[k](a[k])
        || !!optionalcheckermap[k] && optionalcheckermap[k](a[k])
    }) && required.every(k => keys.indexOf(k) !== -1);

  };
}
const checkAccessPerms = checkObject<ServerConfig_AccessOptions>({
  mkdir: checkBoolean,
  upload: checkBoolean,
  websockets: checkBoolean,
  writeErrors: checkBoolean,
  registerNotice: checkBoolean
});
checkObject<ServerConfig>({
  $schema: checkString,
  __assetsDir: checkString,
  __dirname: checkString,
  __filename: checkString,
  _datafoldertarget: checkString,
  _devmode: checkBoolean,
  authCookieAge: checkNumber,
  tree: checkArray(checkObject({
    $element: checkStringEnum<"host">("host"),
    $mount: (a): a is any => true
  })),
  authAccounts: checkRecord(checkString, checkObject<ServerConfig_AuthAccountsValue>({
    clientKeys: checkRecord(checkString, checkObject<ServerConfig["authAccounts"][""]["clientKeys"][""]>({
      publicKey: checkString,
      userSalt: checkString
    })),
    permissions: checkAccessPerms
  })),
  bindInfo: checkObject<ServerConfig["bindInfo"]>({
    _bindLocalhost: checkBoolean,
    bindAddress: checkArray(checkString),
    bindWildcard: checkBoolean,
    enableIPv6: checkBoolean,
    filterBindAddress: checkBoolean,
    https: checkBoolean,
    localAddressPermissions: checkRecord(checkString, checkAccessPerms),
    port: checkNumber
  }),
  directoryIndex: checkObject<ServerConfig["directoryIndex"]>({
    defaultType: checkStringEnum("html", "json"),
    icons: checkRecord(checkString, checkArray(checkString)),
    mimetypes: checkRecord(checkString, checkArray(checkString)),
    mixFolders: checkBoolean,
    types: checkRecord(checkString, checkString)
  }),
  logging: checkObject<ServerConfig["logging"]>({
    debugLevel: checkNumber,
    logAccess: or(checkString, checkBooleanFalse),
    logColorsToFile: checkBoolean,
    logError: checkString,
    logToConsoleAlso: checkBoolean
  }),
  putsaver: checkObject<ServerConfig["putsaver"]>({
    backupDirectory: checkString,
    etag: checkStringEnum("", "required", "disabled"),
    etagWindow: checkNumber
  }),
  EXPERIMENTAL_clientside_datafolders: checkNever
})