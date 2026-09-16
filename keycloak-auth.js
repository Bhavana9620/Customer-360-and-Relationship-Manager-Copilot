const { createRemoteJWKSet, jwtVerify } = require('jose');

// Docker-internal URL: used to contact Keycloak
const KEYCLOAK_INTERNAL_URL =
  process.env.KEYCLOAK_INTERNAL_URL || 'http://keycloak:8080';

// Public/browser URL: this is the issuer written inside the JWT
const KEYCLOAK_ISSUER =
  process.env.KEYCLOAK_ISSUER ||
  'http://localhost:8080/realms/customer360';

const JWKS = createRemoteJWKSet(
  new URL(
    `${KEYCLOAK_INTERNAL_URL}/realms/customer360/protocol/openid-connect/certs`
  )
);

async function keycloakAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';

    if (!header.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'unauthorized',
        message: 'Missing Bearer token'
      });
    }

    const token = header.substring(7);

    const { payload } = await jwtVerify(
      token,
      JWKS,
      {
        issuer: KEYCLOAK_ISSUER
      }
    );

    const roles = payload.realm_access?.roles || [];

    req.user = {
      id: payload.sub,
      name:
        payload.name ||
        payload.preferred_username ||
        'User',
      username:
        payload.preferred_username || '',
      email:
        payload.email || '',
      role: getApplicationRole(roles),
      roles,
      branch:
        payload.branch || ''
    };

    req.keycloakUser = payload;

    next();

  } catch (error) {
    console.error(
      'Keycloak authentication failed:',
      error.message
    );

    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired Keycloak token'
    });
  }
}

function getApplicationRole(roles) {
  if (roles.includes('Auditor')) return 'Auditor';
  if (roles.includes('Manager')) return 'Manager';
  if (roles.includes('Operations')) return 'Operations';
  if (roles.includes('RM')) return 'RM';

  return 'RM';
}

module.exports = {
  keycloakAuth
};
