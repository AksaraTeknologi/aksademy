<?php

use App\Services\HtmlContentSanitizer;

it('strips script tags, event handlers, iframes, and javascript urls while keeping safe formatting', function () {
    $sanitizer = new HtmlContentSanitizer();

    $dirtyHtml = <<<'HTML'
        <h1>Pengenalan HTML</h1>
        <p onclick="alert('xss')">Belajar dasar <strong>HTML</strong> dan <em>struktur dokumen</em>.</p>
        <script>alert('steal cookies')</script>
        <iframe src="https://evil.example/embed"></iframe>
        <img src="javascript:alert(1)" onerror="alert(2)" alt="Bad">
        <img src="https://example.com/diagram.png" onerror="alert(3)" alt="Diagram">
        <a href="javascript:void(0)" target="_blank">Bad Link</a>
        <a href="https://aksademy.id" target="_blank">Good Link</a>
        <pre><code class="language-html">&lt;h1&gt;Halo&lt;/h1&gt;</code></pre>
        <ul><li>Item 1</li><li>Item 2</li></ul>
    HTML;

    $clean = $sanitizer->sanitize($dirtyHtml);

    expect($clean)
        ->toContain('<h1>Pengenalan HTML</h1>')
        ->toContain('<strong>HTML</strong>')
        ->toContain('<em>struktur dokumen</em>')
        ->toContain('<pre><code class="language-html">')
        ->toContain('<ul><li>Item 1</li><li>Item 2</li></ul>')
        ->toContain('src="https://example.com/diagram.png"')
        ->toContain('href="https://aksademy.id"')
        ->toContain('rel="noopener noreferrer"')
        ->not->toContain('<script')
        ->not->toContain('steal cookies')
        ->not->toContain('<iframe')
        ->not->toContain('onclick')
        ->not->toContain('onerror')
        ->not->toContain('javascript:');
});

it('blocks vbscript, data uris, css injection, svg, math, srcdoc, entity obfuscation, and malformed html', function () {
    $sanitizer = new HtmlContentSanitizer();

    $vectors = <<<'HTML'
        <p style="background:url(javascript:alert(1));color:red">Styled Text</p>
        <style>body { background: url('https://evil.com/track'); }</style>
        <a href="vbscript:msgbox(1)">VB</a>
        <a href="j&#x61;va&#x09;script:alert(1)">Entity JS</a>
        <img src="data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+" alt="SVG Data">
        <a href="data:text/html,<script>alert(1)</script>">Data HTML</a>
        <svg onload="alert(1)"><circle cx="10" cy="10" r="5"></circle></svg>
        <math><mtext><img src="x" onerror="alert(1)"></mtext></math>
        <iframe srcdoc="<script>alert(1)</script>"></iframe>
        <scr<script>ipt>alert(1)</scr</script>ipt>
        <img src="/storage/lesson.png" onpointerover="alert(1)" alt="Lesson Image">
    HTML;

    $clean = $sanitizer->sanitize($vectors);
    $escapedContainerClean = $sanitizer->sanitize("<p>Awal</p></div><script>alert('escape')</script><p>Akhir</p>");

    expect($clean)
        ->toContain('<p>Styled Text</p>')
        ->toContain('<img src="/storage/lesson.png" alt="Lesson Image">')
        ->not->toContain('style=')
        ->not->toContain('<style')
        ->not->toContain('vbscript:')
        ->not->toContain('javascript:')
        ->not->toContain('data:image/svg')
        ->not->toContain('data:text/html')
        ->not->toContain('<svg')
        ->not->toContain('<math')
        ->not->toContain('<iframe')
        ->not->toContain('srcdoc')
        ->not->toContain('<script')
        ->not->toContain('onload')
        ->not->toContain('onerror')
        ->not->toContain('onpointerover');

    expect($escapedContainerClean)
        ->toContain('<p>Awal</p>')
        ->not->toContain('<script')
        ->not->toContain("alert('escape')");
});
