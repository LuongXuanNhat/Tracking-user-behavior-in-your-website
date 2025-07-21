// models/User.js
export class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      email: this.email,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

export class UserEvent {
  constructor(data) {
    this.id = data.id;
    this.user_id = data.user_id;
    this.event_type = data.event_type; // click, view, scroll, hover, load
    this.element_type = data.element_type; // image, blog, review, service, button, link
    this.page_url = data.page_url;
    this.element_id = data.element_id;
    this.timestamp = data.timestamp || new Date().toISOString();
    this.metadata = data.metadata || {};
    this.ip_address = data.ip_address;
    this.user_agent = data.user_agent;
    this.session_id = data.session_id;
  }

  toJSON() {
    return {
      id: this.id,
      user_id: this.user_id,
      event_type: this.event_type,
      element_type: this.element_type,
      page_url: this.page_url,
      element_id: this.element_id,
      timestamp: this.timestamp,
      metadata: this.metadata,
      ip_address: this.ip_address,
      user_agent: this.user_agent,
      session_id: this.session_id,
    };
  }
}

export default { User, UserEvent };
