const { createRemoteJWKSet, jwtVerify } = require('jose');

const KEYCLOAK_URL =
  process.env.KEYCLOAK_URL || 'http://keycloak:8080';

const KEYCLOAK_REALM =
  process.env.KEYCLOAK_REALM || 'customer360';

const ISSUER =
  `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;

const JWKS = createRemoteJWKSet(
  new URL(
    `${ISSUER}/protocol/openid-connect/certs`
  )
);

async function keycloakAuth(req, res, next) {
  try {
    const header =
      req.headers.authorization || '';

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
        issuer: ISSUER
      }
    );

    const roles =
      payload.realm_access?.roles || [];

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
  if (roles.includes('Auditor')) {
    return 'Auditor';
  }

  if (roles.includes('Manager')) {
    return 'Manager';
  }

  if (roles.includes('Operations')) {
    return 'Operations';
  }

  if (roles.includes('RM')) {
    return 'RM';
  }

  return 'RM';
}

module.exports = {
  keycloakAuth
};
