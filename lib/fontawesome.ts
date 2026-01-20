import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";

// предотвратява късно инжектиране на CSS (което причинява flash)
config.autoAddCss = false;
