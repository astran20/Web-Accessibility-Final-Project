# AI and AR Virtual Try-On: Research Summary

**RETHREAD, CSEN 163 group project · Emerging technology research · Ismael Yepez Suarez**

## 1. The problem it solves

Shoppers can't tell how clothes will fit or look until they try them on. Fit is the number one reason people return clothing: it caused 45% of all returns in Narvar's 2022 survey [1], and 61% of shoppers named poor fit as a main reason in Rithum's 2025 report [2]. Many shoppers also "bracket" (order several sizes and send most back) [2]. For a secondhand store, the same problem means wasted trips to try on pieces that don't work. Virtual try-on and AI recommendations aim to fix this before the shopper commits.

## 2. Two technologies, two jobs

| | AR try-on | AI try-on (generative) |
|---|---|---|
| What you see | Your live camera view with clothes drawn on top | A still image of a person wearing the garment |
| How it works | Tracks your body in real time and attaches a 3D garment to it | An AI model creates a new photo from a person image and a garment image |
| Strengths | Instant, interactive, you can move around | Very realistic folds, drape and shadows |
| Weaknesses | Garments can look like stickers; needs 3D models of every item | Slower; no live movement; doesn't guarantee fit |
| Real examples | Snapchat Lens Studio clothing try-on [5], Amazon shoe try-on [6] | Google Shopping "try it on" [3][4] |

### How AR try-on works (simplified)

1. **Camera:** the browser or app opens the camera.
2. **Body tracking:** a machine-learning model finds body "landmarks" (shoulders, elbows, hips, knees) in every frame. Google's free MediaPipe Pose Landmarker does this right in a web page with JavaScript [7].
3. **Fitting:** the 3D garment is stretched and positioned to match those points. Snap adds cloth simulation so fabric moves naturally [5].
4. **Rendering:** the garment is drawn over the video many times per second.

### How AI (generative) try-on works (simplified)

1. The system takes two photos: **the person** and **the garment**.
2. It removes the person's current clothing from the image and estimates their pose.
3. A **diffusion model** (the same family of AI as image generators) produces a new image of that person wearing the garment, keeping details like patterns and wrinkles [3][8].
4. Google's version was trained on about 4 million image pairs. It now works with a user's own full-length photo, or a selfie that it turns into a full-body image [4][8].

The researchers point out a key limitation: the model shows how a garment *looks*, but it **does not promise fit** [8].

## 3. AI recommendations: helping people find what they want

Recommendation systems suggest items a user is likely to want. The two basic approaches are [9]:

- **Content-based filtering:** match item features (category, size, colour, price, style) to what the user asked for or liked before. *Example: you saved a brown jacket, so the system shows other warm outerwear.*
- **Collaborative filtering:** recommend what similar shoppers liked. *Example: people who saved this jacket also saved these jeans.*

Modern stores combine these with a chat-style assistant where users describe what they want in plain words ("warm jacket under $70, size M"). Google's AI Mode shopping is a current example [4].

## 4. Risks and design concerns

- **Privacy and biometrics:** face and body scans can count as biometric data. Under Illinois' BIPA law, retailers including Amazon, Pandora and Aveda have been sued over try-on tools that scanned face geometry without written consent [10]. A real feature must explain what is captured, ask for consent first, and offer a "use a model instead" option.
- **Accuracy and trust:** results are estimates. Users should be told a try-on is a preview, not a guarantee.
- **Inclusion:** models should represent many body types, sizes and skin tones. Google's models range from XXS to 4XL [3].
- **Accessibility:** camera-only features exclude some users, so we need keyboard-usable controls and text descriptions of results.
- **Secondhand challenge:** every thrift item is one-of-a-kind, so stores can't build a 3D model of each piece. Photo-based AI try-on fits used clothing better than 3D AR.

## 5. Sustainability angle

The fashion system is very wasteful: the equivalent of **one garbage truck of textiles is landfilled or burned every second**, and more than half of fast fashion is thrown out within a year [11]. Buying secondhand keeps clothes in use longer, which is the main goal of a circular fashion economy [11]. Try-on and recommendations add to this by:

- cutting unnecessary trips and returns, since shoppers only visit for pieces likely to fit;
- helping one-of-a-kind items find the right buyer faster, so fewer end up unsold and discarded.

## 6. What our RETHREAD demo will simulate

The project doesn't require a real AI system, so our demo **imitates the experience with JavaScript** and is clearly labeled as a simulation:

- **Try-on:** pick a sample person (illustrated figures with varied body types) and a clothing item. A short "analyzing fit" step plays, then the garment appears on the figure with a fit note (for example, "runs large for this size"). Users can compare two looks side by side.
- **Style assistant:** users type or tap a request. Simple keyword matching (a basic form of content-based filtering) returns matching items with a short reason for each one.
- **No camera, no uploads, no real AI.** This avoids the privacy issues above and keeps the demo accessible.

A real version could use MediaPipe for body tracking [7] or a hosted try-on model like Google's [3][4].

## Sources

1. Narvar, *The State of Returns 2022*. https://see.narvar.com/rs/249-TEC-877/images/2022%20State%20of%20Returns%20Report%20-%20102822.pdf
2. Rithum, *2025 Global Returns & Profit Impact Report*. https://www.rithum.com/wp-content/uploads/2025/05/Rithum-2025-Global-Returns-Profit-Impact-Report.pdf
3. Google, "How AI makes virtual try-on more realistic" (2023). https://blog.google/products-and-platforms/products/shopping/virtual-try-on-google-generative-ai/
4. Google, "Shop with AI Mode, use AI to buy and try clothes on yourself virtually" (2025). https://blog.google/products-and-platforms/products/shopping/google-shopping-ai-mode-virtual-try-on-update/
5. Snap, "Virtual Try-On with Lens Studio". https://ar.snap.com/blog/ar-virtual-try-on-ecommerce-lens-studio
6. Amazon, "Amazon Fashion Introduces Virtual Try-On for Shoes" (2022). https://press.aboutamazon.com/2022/6/amazon-fashion-introduces-a-more-convenient-way-to-shop-with-virtual-try-on-for-shoes
7. Google AI Edge, *MediaPipe Pose Landmarker guide for Web*. https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js
8. Zhu et al., "TryOnDiffusion: A Tale of Two UNets," CVPR 2023. https://tryondiffusion.github.io/
9. Google for Developers, *Recommendation Systems course* (content-based and collaborative filtering). https://developers.google.com/machine-learning/recommendation
10. ArentFox Schiff, "Biometric Privacy Class Actions Take Aim at Virtual 'Try-On' Retailers." https://www.afslaw.com/perspectives/alerts/biometric-privacy-class-actions-take-aim-virtual-try-retailers
11. Ellen MacArthur Foundation, "Fashion and the circular economy." https://www.ellenmacarthurfoundation.org/fashion-and-the-circular-economy-deep-dive
