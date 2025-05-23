/* global HTMLElement, customElements */
import { createVideoElement, addToast } from '../../../../../../lib/utils.js'
import Store from '../../../../../../lib/store.js'
const store = new Store()

const searchEventSupported = 'search' in document.createElement('input')
console.log({ searchEventSupported })

class SearchVideos extends HTMLElement {
  constructor () {
    super()
    this.previousSearchTerm = ''
  }

  connectedCallback () {
    this.render()
    this.registerEvents()
  }

  disconnectedCallback () {
    this.unregisterEvents()
  }

  registerEvents () {
    this.querySelector('#search').addEventListener('input', this.searchHandler.bind(this))
    this.querySelector('#excluded').addEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#ignored').addEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#downloaded').addEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#summarized').addEventListener('change', this.searchHandler.bind(this))
  }

  unregisterEvents () {
    this.querySelector('#search').removeEventListener('input', this.searchHandler.bind(this))
    this.querySelector('#excluded').removeEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#ignored').removeEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#downloaded').removeEventListener('change', this.searchHandler.bind(this))
    this.querySelector('#summarized').removeEventListener('change', this.searchHandler.bind(this))
  }

  render () {
    this.innerHTML = /* html */`
      <input type="search" incremental="incremental" id="search" placeholder="🔍 Search videos or paste video url" autofocus>
      <details>
        <summary>Additional filters</summary>
        <div class="flex " id="search-filters">
          <div class="flex-1">
            <label for="downloaded">downloaded</label>
            <input type="checkbox" id="downloaded"/>
          </div>
          <div class="flex-1">
            <label for="summarized">summarized</label>
            <input type="checkbox" id="summarized"/>
          </div>
          <div class="flex-1">
            <label for="ignored">ignored</label>
            <input type="checkbox" id="ignored"/>
          </div>
          <div class="flex-1">
            <label for="excluded">excluded</label>
            <input type="checkbox" id="excluded"/>
          </div>
        </div>
      </details>
    `
  }

  searchHandler (event) {
    event.preventDefault()
    const $search = this.querySelector('#search')
    let searchTerm = $search.value.trim()
    if (this.previousSearchTerm === searchTerm && event.target === $search) return
    if (event.target === $search) this.previousSearchTerm = searchTerm

    const $status = document.querySelector('#filter-results-status')
    $status.innerText = ''

    if (searchTerm.match('https?://')) {
      addToast('Downloading video...')
      fetch('/api/download-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: searchTerm, external: true })
      })
        .catch((error) => console.error('Error starting download:', error))
      $search.value = ''
      return
    }

    searchTerm = searchTerm.toLowerCase()
    document.body.classList.add('searching')
    const excluded = this.querySelector('#excluded').checked
    const ignored = this.querySelector('#ignored').checked
    const downloaded = this.querySelector('#downloaded').checked
    const summarized = this.querySelector('#summarized').checked

    if (excluded) {
      this.querySelector('#ignored').disabled = true
    } else {
      this.querySelector('#ignored').disabled = false
    }
    if (ignored) {
      this.querySelector('#excluded').disabled = true
    } else {
      this.querySelector('#excluded').disabled = false
    }

    fetch(`/api/videos?filter=${encodeURIComponent(searchTerm)}${excluded ? '&excluded=true' : ''}${downloaded ? '&downloaded=true' : ''}${ignored ? '&ignored=true' : ''}${summarized ? '&summarized=true' : ''}`)
      .then(res => res.json())
      .then((videos) => {
        const $videosContainer = document.querySelector('.main-videos-container')
        if (!$videosContainer) return
        $videosContainer.innerHTML = ''
        const showOriginalThumbnail = store.get(store.showOriginalThumbnailKey)
        videos.forEach(video =>
          $videosContainer.appendChild(createVideoElement(video, showOriginalThumbnail))
        )
        if (!searchTerm) {
          $status.innerText = ''
        } else {
          if (videos.length > 0) $status.innerText = `Found ${videos.length} videos`
          else $status.innerText = 'No videos found'
        }
      })
      .catch(err => {
        console.error(err)
        $status.innerText = `An error occurred: ${err.message}`
      })
      .finally(() => {
        document.body.classList.remove('searching')
      })
  }
}
customElements.define('search-videos', SearchVideos)
