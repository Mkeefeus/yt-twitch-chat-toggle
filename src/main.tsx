import { render } from 'preact'
import { Popup } from './popup.tsx'

// Mount to the container defined in popup.html
render(<Popup />, document.getElementById('app')!)
