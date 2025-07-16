// Copyright 2025 The Outline Authors
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import UIKit
import Capacitor

class OutlineBridgeViewController: CAPBridgeViewController {
    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        if #available(iOS 17.0, *) {
            let endpoint = NWEndpoint.hostPort(
                host: NWEndpoint.Host(Config.proxyHost),
                port: NWEndpoint.Port(Config.proxyPort)!
            )
            let proxyConfig = ProxyConfiguration.init(httpCONNECTProxy: endpoint)

            let websiteDataStore = WKWebsiteDataStore.default()
            websiteDataStore.proxyConfigurations = [proxyConfig]

            configuration.websiteDataStore = websiteDataStore
        } else {
            // TODO: use scheme handler
        }

        return super.webView(with: frame, configuration: configuration)
    }
    
    override open func viewWillLayoutSubviews() {
        super.viewWillLayoutSubviews()

        guard let webView = self.webView else { return }
        
        if let safeAreaInsets = self.view.window?.safeAreaInsets {
            webView.frame.origin = CGPoint(x: safeAreaInsets.left, y: safeAreaInsets.top)
            webView.frame.size = CGSize(
                width: UIScreen.main.bounds.width - safeAreaInsets.left - safeAreaInsets.right,
                height: UIScreen.main.bounds.height - safeAreaInsets.top - safeAreaInsets.bottom
            )
        }
    }
}
