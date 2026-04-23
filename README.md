
<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![MIT License][license-shield]][license-url]
[![LinkedIn][linkedin-shield]][linkedin-url]



<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/simplecyber/jira-helper">
    <img src="icons/icon128.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">Jira Helper – Zephyr Scale Filler</h3>

  <p align="center">
    An awesome Chrome extension to jumpstart your Zephyr Scale automated test inputs!
    <br />
    <a href="https://github.com/simplecyber/jira-helper"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://github.com/simplecyber/jira-helper">View Demo</a>
    &middot;
    <a href="https://github.com/simplecyber/jira-helper/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
    &middot;
    <a href="https://github.com/simplecyber/jira-helper/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
  </p>
</div>



<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about-the-project">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#contact">Contact</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>



<!-- ABOUT THE PROJECT -->
## About The Project

[![Product Name Screen Shot][product-screenshot]](https://github.com/simplecyber/jira-helper)

The **Jira Helper – Zephyr Scale Filler** is a powerful Chrome extension designed to eliminate the tedious manual entry of test case steps into Jira's Zephyr Scale. Often, QA engineers generate structured test case steps from AI tools or external editors and then spend excessive time copy-pasting them into the Zephyr Scale interface step by step. 

This extension features a simple, persistent sidebar where users can paste multi-step test scripts in bulk. It intelligently parses the content—including the step description, test data, and expected results—and acts directly on the active Jira frame to automate the process of adding those steps inside the Zephyr Scale editor.

Here's why you should use it:
* Focus your time on designing quality test cases rather than manual data entry.
* Eliminate tedious back-and-forth window-switching and repetitive clicks.
* Seamlessly integrates AI-generated markdown steps directly into Jira.

Use the `manifest.json` and start automating your Zephyr inputs today!

<p align="right">(<a href="#readme-top">back to top</a>)</p>



### Built With

This extension was built using modern web standard technologies, without heavy frameworks, relying deeply on the Chrome Extension API.

* [![JavaScript][javascript.js]][javascript-url]
* [![HTML5][html5.dev]][html5-url]
* [![CSS3][css3.dev]][css3-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- GETTING STARTED -->
## Getting Started

To get a local copy up and running follow these simple steps.

### Prerequisites

You only need an active Chrome browser (or a Chromium-based browser like Edge, Brave).

### Installation

1. Clone the repo or download the ZIP of this project on your local machine.
   ```sh
   git clone https://github.com/simplecyber/jira-helper.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** in the top right corner.
4. Click on **Load unpacked** and select the root directory of this repository (where `manifest.json` is located).
5. The extension "Jira Helper – Zephyr Scale Filler" will appear in your extensions list.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- USAGE EXAMPLES -->
## Usage

1. Open your Jira workspace and navigate to your active Zephyr Scale test case in edit mode.
2. Click on the **Jira Helper** extension icon, which opens the sidebar panel.
3. Paste your test case prompt instructions into the textarea and click **Parse Setup**.
   * *Pro Tip*: You can use the **Copy Prompt** button to grab a ready-to-use prompt template for your AI (ChatGPT, Claude, Gemini, etc.) to generate perfectly formatted tests.
4. The extension validates and previews the steps (Step Description, Test Data, Expected Result).
5. Set the delay you'd like (e.g. 1.0s to allow the Zephyr UI to process each step).
6. Click **Fill Steps**. The extension systematically locates the active iframe, simulates human-like typing, triggers React state changes, and automatically presses "Add Step" until all steps are populated.

_For more examples, please refer to the internal project documentation._

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ROADMAP -->
## Roadmap

- [x] Integrate parsing logic for AI-generated Markdown
- [x] Sidebar UI with step preview feature
- [x] Stable iframe communication with Jira
- [ ] Add explicit settings persistence
- [ ] Support additional test management plugins

See the [open issues](https://github.com/simplecyber/jira-helper/issues) for a full list of proposed features (and known issues).

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTRIBUTING -->
## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Top contributors:

<a href="https://github.com/simplecyber/jira-helper/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=simplecyber/jira-helper" alt="contrib.rocks image" />
</a>

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- LICENSE -->
## License

Distributed under the MIT License. See `LICENSE` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- CONTACT -->
## Contact

Satyam Yadav - [@satyam_yadav_04](https://twitter.com/satyam_yadav_04) - satyamok03@gmail.com

Project Link: [https://github.com/simplecyber/jira-helper](https://github.com/simplecyber/jira-helper)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [Best README Template](https://github.com/othneildrew/Best-README-Template)
* [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
* [Jira Software](https://www.atlassian.com/software/jira)

<p align="right">(<a href="#readme-top">back to top</a>)</p>



<!-- MARKDOWN LINKS & IMAGES -->
<!-- https://www.markdownguide.org/basic-syntax/#reference-style-links -->
[contributors-shield]: https://img.shields.io/github/contributors/simplecyber/jira-helper.svg?style=for-the-badge
[contributors-url]: https://github.com/simplecyber/jira-helper/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/simplecyber/jira-helper.svg?style=for-the-badge
[forks-url]: https://github.com/simplecyber/jira-helper/network/members
[stars-shield]: https://img.shields.io/github/stars/simplecyber/jira-helper.svg?style=for-the-badge
[stars-url]: https://github.com/simplecyber/jira-helper/stargazers
[issues-shield]: https://img.shields.io/github/issues/simplecyber/jira-helper.svg?style=for-the-badge
[issues-url]: https://github.com/simplecyber/jira-helper/issues
[license-shield]: https://img.shields.io/github/license/simplecyber/jira-helper.svg?style=for-the-badge
[license-url]: https://github.com/simplecyber/jira-helper/blob/master/LICENSE
[linkedin-shield]: https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555
[linkedin-url]: https://linkedin.com/in/simplecyber
[product-screenshot]: ./icons/extension.png
[javascript.js]: https://img.shields.io/badge/JavaScript-323330?style=for-the-badge&logo=javascript&logoColor=F7DF1E
[javascript-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[html5.dev]: https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white
[html5-url]: https://developer.mozilla.org/en-US/docs/Web/HTML
[css3.dev]: https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white
[css3-url]: https://developer.mozilla.org/en-US/docs/Web/CSS
