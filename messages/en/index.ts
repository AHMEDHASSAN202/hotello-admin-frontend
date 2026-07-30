import admins from './admins.json';
import auth from './auth.json';
import common from './common.json';
import errors from './errors.json';
import hotels from './hotels.json';
import notifications from './notifications.json';
import overview from './overview.json';
import plans from './plans.json';
import profile from './profile.json';
import roles from './roles.json';

/**
 * English message bundle — the canonical key set. Every namespace is statically
 * imported so webpack bundles it and scripts/check-i18n.mjs can diff `ar`.
 */
const messages = {
  admins,
  auth,
  common,
  errors,
  hotels,
  notifications,
  overview,
  plans,
  profile,
  roles,
};

export default messages;
