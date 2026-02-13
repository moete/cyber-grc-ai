import { test } from '@japa/runner';
import { hasPermission, canAccessResource, Permission, Roles } from '@shared';

test.group('RBAC permissions (hasPermission)', () => {
  test('Owner has ORG_DELETE and USER_MANAGE', ({ assert }) => {
    assert.isTrue(hasPermission(Roles.OWNER, Permission.ORG_DELETE));
    assert.isTrue(hasPermission(Roles.OWNER, Permission.USER_MANAGE));
  });

  test('hasPermission normalizes string role (e.g. from API)', ({ assert }) => {
    assert.isTrue(hasPermission('Owner', Permission.SUPPLIER_CREATE));
    assert.isTrue(hasPermission('owner', Permission.SUPPLIER_READ));
    assert.isFalse(hasPermission('unknown', Permission.SUPPLIER_READ));
    assert.isFalse(hasPermission(undefined, Permission.SUPPLIER_READ));
  });

  test('Admin does not have ORG_DELETE', ({ assert }) => {
    assert.isFalse(hasPermission(Roles.ADMIN, Permission.ORG_DELETE), 'Only Owner can delete organisation');
  });

  test('Analyst cannot delete suppliers', ({ assert }) => {
    assert.isFalse(hasPermission(Roles.ANALYST, Permission.SUPPLIER_DELETE), 'Analyst must not be allowed to delete suppliers');
  });

  test('Auditor is read-only on suppliers', ({ assert }) => {
    assert.isTrue(hasPermission(Roles.AUDITOR, Permission.SUPPLIER_READ), 'Auditor should be able to read suppliers');
    assert.isFalse(hasPermission(Roles.AUDITOR, Permission.SUPPLIER_CREATE), 'Auditor must not be able to create suppliers');
    assert.isFalse(hasPermission(Roles.AUDITOR, Permission.SUPPLIER_UPDATE), 'Auditor must not be able to update suppliers');
    assert.isFalse(hasPermission(Roles.AUDITOR, Permission.SUPPLIER_DELETE), 'Auditor must not be able to delete suppliers');
  });
});

test.group('Tenant isolation helper', () => {
  test('User cannot access resource of another organisation', ({ assert }) => {
    const canAccess = canAccessResource(Roles.ADMIN, 'org-a', 'org-b', Permission.SUPPLIER_READ);

    assert.isFalse(canAccess, 'User from org-a must not access resource from org-b');
  });

  test('User with permission can access resource in same organisation', ({ assert }) => {
    const canAccess = canAccessResource(Roles.ADMIN, 'org-a', 'org-a', Permission.SUPPLIER_READ);

    assert.isTrue(canAccess, 'Admin with SUPPLIER_READ should access resource in same org');
  });
});
