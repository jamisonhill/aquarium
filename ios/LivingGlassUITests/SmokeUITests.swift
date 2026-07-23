// SmokeUITests.swift — launch the wrapped aquarium, wait for the engine's
// first rendered frame, then relaunch and prove the custom-scheme origin's
// localStorage survived (tank saves depend on it).

import XCTest

final class SmokeUITests: XCTestCase {
    func testEngineRendersAndStoragePersists() {
        let app = XCUIApplication()
        app.launch()

        // First launch: the engine must reach its first frame.
        XCTAssertTrue(
            app.staticTexts["aquarium.ready"].waitForExistence(timeout: 20),
            "engine should render its first frame"
        )

        // Relaunch: the localStorage marker stamped on launch #1 must still be
        // there — proving persistence under the app:// scheme.
        app.terminate()
        app.launch()
        XCTAssertTrue(
            app.staticTexts["aquarium.ready"].waitForExistence(timeout: 20),
            "engine should render after relaunch"
        )
        XCTAssertTrue(
            app.staticTexts["aquarium.persisted"].waitForExistence(timeout: 10),
            "localStorage should persist across launches under the app:// origin"
        )
    }
}
