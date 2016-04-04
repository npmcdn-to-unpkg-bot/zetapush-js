import { ClientHelper } from './client-helper'

import { NotYetImplementedError } from './utils'

/**
 *
 */
export const API_URL = 'https://api.zpush.io/'

/**
 *
 */
export class Client {
  /**
   *
   */
  constructor({ apiUrl = API_URL, businessId, handshakeFactory, resource = null }) {
    this.client = new ClientHelper({
      apiUrl,
      businessId,
      handshakeFactory,
      resource
    })
  }
  /**
   *
   */
  connect() {
    this.client.connect()
  }
  /**
   *
   */
  disconnect() {
    this.client.disconnect()
  }
  /**
   *
   */
  createServicePublisher({ deploymentId, publisher }) {
    throw new NotYetImplementedError('createServicePublisher')
  }
  /**
   *
   */
  getBusinessId() {
    return this.client.getBusinessId()
  }
  /**
   *
   */
  getResource() {
    return this.client.getResource()
  }
  /**
   *
   */
  getUserId() {
    return this.client.getUserId()
  }
  /**
   *
   */
  getSessionId() {
    return this.client.getSessionId()
  }
  /**
   *
   */
  subscribeListener({ deploymentId, serviceListener }) {
    this.client.subscribe(`/service/${this.getBusinessId()}/${deploymentId}`, serviceListener)
  }
  /**
   *
   */
  createPubSub({ deploymentId, serviceListener, publisher }) {
    throw new NotYetImplementedError('createPubSub')
  }
  /**
   *
   */
  setResource(resource) {
    this.client.setResource(resource)
  }
  /**
   *
   */
  addConnectionStatusListener(listener) {
    this.client.addConnectionStatusListener(listener)
  }
  /**
   *
   */
  handshake(handshakeFactory) {
    this.stop()
    if (handshakeFactory) {
      this.client.setHandshakeFactory(handshakeFactory)
    }
    this.start()
  }

}
