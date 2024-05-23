import { expect, test } from '@playwright/test'

const EMAIL = 'tester+clerk_test@example.com'
const CODE = '424242'
const URL_SIGN_IN = '/sign-in'
const URL_ADMIN = '/admin'
const URL_PROFILE = '/admin/profile'
const URL_PROTECTED_ROUTE = '/some/random/protected-route/foo'
const URL_ROOT = '/'
const SERVER_SECRET = 'SvelteKit is awesome'

test('User starts logged out', async ({ page }) => {
	await page.goto('/')
	const signIn = page.getByTestId('sign-in')
	await expect(signIn).toBeVisible({ timeout: 30_000 })
})

test('User cannot access admin if not logged in', async ({ page }) => {
	await page.goto(URL_ADMIN)
	await page.waitForURL(URL_SIGN_IN + '?redirectUrl=' + URL_ADMIN)
	await page.goto(URL_PROFILE)
	await page.waitForURL(URL_SIGN_IN + '?redirectUrl=' + URL_PROFILE)
})

test('User cannot access function-based protected route if not logged in', async ({ page }) => {
	await page.goto(URL_PROTECTED_ROUTE)
	await page.waitForURL(URL_SIGN_IN + '?redirectUrl=' + URL_PROTECTED_ROUTE)
})

test('User can log in', async ({ context, page }) => {
	test.slow()

	// Navigate to sign in page.
	await page.goto(URL_ROOT)
	const signIn = page.getByTestId('sign-in')
	await signIn.click()

	// Submit the email.
	await page.waitForURL(URL_SIGN_IN)
	const email = page.locator('input[name="identifier"][type="text"]')
	await email.fill(EMAIL)
	await page.keyboard.press('Enter')
	try {
		await expect(email).not.toBeVisible()
	} catch (e) {
		const errorMessage = page.locator('#error-identifier')
		throw new Error(`Error submitting email (${EMAIL}): ${await errorMessage.textContent()}`)
	}

	// Submit the OTP.
	const firstCodeInputField = page.locator('input[name="codeInput-0"]')
	await expect(firstCodeInputField).toBeVisible()
	await firstCodeInputField.click()
	await page.keyboard.type(CODE, { delay: 150 }) // Need this slight delay to avoid flaky tests.
	await page.keyboard.press('Enter')

	// Arrive at the admin page.
	await page.waitForURL(URL_ADMIN)
	const serverSecret = page.getByTestId('server-secret')
	await expect(serverSecret).toContainText(SERVER_SECRET)

	// Delete the session cookie to simulate finishing OAuth login.
	// TODO: move this to a helper function.
	const oldCookies = await context.cookies()
	const otherCookies = oldCookies.filter((cookie) => cookie.name !== '__session')
	context.clearCookies()
	context.addCookies(otherCookies)

	// Verify that we really do not have a __session cookie.
	const cookies = await context.cookies()
	expect(cookies).not.toContain('__session')

	// Go to the sign-in page with a redirectAfterAuth param.
	await page.goto(URL_SIGN_IN + '?redirectAfterAuth=' + URL_PROFILE)

	// Arrive at the admin page.
	await page.waitForURL(URL_PROFILE)
	await expect(serverSecret).toContainText(SERVER_SECRET)

	// Can see the user button.
	const userButton = page.getByTestId('user-button')
	await expect(userButton).toBeVisible()

	// Find an img within userButton and click it.
	const userButtonImage = userButton.locator('img')
	await expect(userButtonImage).toBeVisible()
	await userButtonImage.click()

	// Can see the sign out button.
	const signOut = page.locator('[data-localization-key="userButton.action__signOut"]')
	await expect(signOut).toBeVisible()
	await signOut.click()

	// Arrive at the front page, not signed in.
	await page.waitForURL(URL_ROOT)
	await expect(signIn).toBeVisible()
	await expect(userButton).not.toBeVisible()
})
