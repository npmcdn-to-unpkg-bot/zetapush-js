/**
 * Match unsecure pattern web
 * @type {RegExp}
 */
const UNSECURE_PATTERN = /^http:\/\/|^\/\//

/**
* Default ZetaPush API URL
* @access private
*/
export const API_URL = 'https://api.zpush.io/'

/**
 * @access private
 * @param {Array<Object>} list
 * @return {Object}
 */
export const shuffle = (list) => {
  const index = Math.floor(Math.random() * list.length)
  return list[index]
}

/**
 * @access private
 * @param {string} url
 * @param {boolean} forceHttps
 * @return {string}
 */
export const getSecureUrl = (url, forceHttps) => {
  return forceHttps ? url.replace(UNSECURE_PATTERN, 'https://') : url
}

/**
 * @access private
 * @param {{apiUrl: string, sandboxId: string, forceHttps: boolean}} parameters
 * @return {Promise}
 */
export const getServers = ({ apiUrl, sandboxId, forceHttps }) => {
  const secureApiUrl = getSecureUrl(apiUrl, forceHttps)
  const url = `${secureApiUrl}${sandboxId}`
  return fetch(url)
    .then((response) => {
      return response.json()
    })
    .then(({ servers }) => {
      // TODO: Replace by a server side implementation when available
      return servers.map((server) => {
        return getSecureUrl(server, forceHttps)
      })
    })
}

/**
 * @access private
 * @return {boolean}
 */
export const isHttpsProtocol = () => {
  return 'https:' === location.protocol
}

/**
 * @access  private
 * @return {boolean}
 */
export const isPrototypeOf = (derived, parent) => {
  let prototype = Object.getPrototypeOf(derived)
  let is = false
  while (!(is || prototype === null)) {
    is = prototype === parent
    prototype = Object.getPrototypeOf(prototype)
  }
  return is
}
