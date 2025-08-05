var W = (function () {
    function e() {
      var t =
        arguments.length > 0 && void 0 !== arguments[0]
          ? arguments[0]
          : {};
      Object(c.a)(this, e);
      var n = se.renderer.extensions.has("OES_texture_float_linear");
      (this._linear = se.renderer.capabilities.isWebGL2
        ? n
        : se.renderer.extensions.has("OES_texture_half_float_linear")),
        (this._simRes = t.simRes || 128),
        (this._dyeRes = t.dyeRes || 512),
        (this._simTexelSize = 1 / this._simRes),
        (this._dyeTexelSize = 1 / this._dyeRes),
        (this._pressureIterations = t.pressureIterations || 3),
        (this._densityDissipation = t.densityDissipation || 0.97),
        (this._velocityDissipation = t.velocityDissipation || 0.98),
        (this._pressureDissipation = t.pressureDissipation || 0.8),
        (this._curlStrength = t.curlStrength || 10),
        (this._splatRadius = t.splatRadius || 0.12),
        (this._splatForce = t.splatForce || 6e3),
        (this._splatMode =
          I[(t.splatMode && t.splatMode.toUpperCase()) || "LINE"]),
        (this._borders = void 0 !== t.borders && t.borders),
        (this._mode = $[(t.mode && t.mode.toUpperCase()) || "SCREEN"]),
        (this._aspect = 1),
        (this._enabled = !1),
        (this.points = [
          {
            position: new Y.t(0.5, 0.5),
            prevPosition: new Y.t(0.5, 0.5),
            lastUpdate: 0,
            velocity: 0,
          },
        ]),
        this._createRTs(),
        this._createMaterials(),
        this._createScene(),
        (this.dyeUniform = {
          value: null,
        }),
        (this.velUniform = {
          value: null,
        }),
        this.enable();
    }
    return (
      Object(v.a)(e, [
        {
          key: "_createRTs",
          value: function () {
            (this._density = H(
              this._dyeRes,
              Y.m,
              this._linear ? Y.h : Y.j
            )),
              (this._velocity = H(
                this._simRes,
                Y.m,
                this._linear ? Y.h : Y.j
              )),
              (this._pressure = H(this._simRes, Y.m, Y.j)),
              (this._divergence = new Y.w(this._simRes, this._simRes, {
                format: Y.m,
                type: Y.g,
                magFilter: Y.j,
                minFilter: Y.j,
                depthBuffer: !1,
              })),
              (this._curl = new Y.w(this._simRes, this._simRes, {
                format: Y.m,
                type: Y.g,
                magFilter: Y.j,
                minFilter: Y.j,
                depthBuffer: !1,
              }));
          },
        },
        {
          key: "_createMaterials",
          value: function () {
            var e = se.renderer.capabilities,
              t = e.getMaxPrecision("highp"),
              i = e.getMaxPrecision("mediump"),
              n = "\n            precision ".concat(
                t,
                " float;\n            \nattribute vec3 position;\nattribute vec2 uv;\n\nuniform vec2 texelSize;\n\nvarying vec2 vUv;\nvarying vec2 vL;\nvarying vec2 vR;\nvarying vec2 vT;\nvarying vec2 vB;\n\nvoid main () {\n    vUv = uv;\n    vL = vUv - vec2(texelSize.x, 0.0);\n    vR = vUv + vec2(texelSize.x, 0.0);\n    vT = vUv + vec2(0.0, texelSize.y);\n    vB = vUv - vec2(0.0, texelSize.y);\n    gl_Position = vec4(position, 1.0);\n}\n\n        "
              ),
              r = "\n            precision ".concat(
                t,
                " float;\n            \nattribute vec3 position;\nattribute vec2 uv;\n\nvarying vec2 vUv;\n\nvoid main () {\n    vUv = uv;\n    gl_Position = vec4(position, 1.0);\n}\n\n        "
              ),
              a = "\n            precision ".concat(
                t,
                " float;\n            \nattribute vec3 position;\nattribute vec2 uv;\n\nuniform vec2 texelSize;\n\nvarying vec2 vL;\nvarying vec2 vR;\nvarying vec2 vT;\nvarying vec2 vB;\n\nvoid main () {\n    vL = uv - vec2(texelSize.x, 0.0);\n    vR = uv + vec2(texelSize.x, 0.0);\n    vT = uv + vec2(0.0, texelSize.y);\n    vB = uv - vec2(0.0, texelSize.y);\n    gl_Position = vec4(position, 1.0);\n}\n\n        "
              );
            (this._materialClear = new Y.n({
              uniforms: {
                texelSize: {
                  value: new Y.t(),
                },
                uTexture: {
                  value: null,
                },
                value: {
                  value: this._pressureDissipation,
                },
              },
              vertexShader: r,
              fragmentShader: "\n                precision "
                .concat(i, " float;\n                precision ")
                .concat(
                  i,
                  " sampler2D;\n                \nuniform sampler2D uTexture;\nuniform float value;\n\nvarying highp vec2 vUv;\n\nvoid main () {\n    gl_FragColor.rgb = value * texture2D(uTexture, vUv).rgb;\n    gl_FragColor.a = 1.0;\n}\n\n            "
                ),
              depthTest: !1,
              depthWrite: !1,
            })),
              (this._materialSplat = new Y.n({
                uniforms: {
                  texelSize: {
                    value: new Y.t(),
                  },
                  uTarget: {
                    value: null,
                  },
                  aspectRatio: {
                    value: 1,
                  },
                  color: {
                    value: new Y.u(),
                  },
                  point: {
                    value: new Y.t(),
                  },
                  prevPoint: {
                    value: new Y.t(),
                  },
                  radius: {
                    value: 1,
                  },
                  isDye: {
                    value: !1,
                  },
                },
                vertexShader: r,
                fragmentShader: "\n                precision "
                  .concat(t, " float;\n                precision ")
                  .concat(
                    t,
                    " sampler2D;\n                \nuniform sampler2D uTarget;\nuniform float aspectRatio;\nuniform vec3 color;\nuniform vec2 point;\nuniform vec2 prevPoint;\nuniform float radius;\nuniform bool isDye;\n\nvarying vec2 vUv;\n\nfloat line(vec2 uv, vec2 point1, vec2 point2) {\n    vec2 pa = uv - point1, ba = point2 - point1;\n    pa.x *= aspectRatio;\n    ba.x *= aspectRatio;\n    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);\n    return length(pa - ba * h);\n}\n\nfloat cubicIn(float t) {\n  return t * t * t;\n}\n\nvoid main () {\n    vec3 splat =  cubicIn(clamp(1.0 - line(vUv, prevPoint.xy, point.xy) / radius, 0.0, 1.0)) * color;\n\n    vec3 base = texture2D(uTarget, vUv).xyz;\n    vec3 result = base + splat;\n    if (isDye) result = clamp(result, vec3(0.0), vec3(1.0));\n\n    gl_FragColor = vec4(result, 1.0);\n}\n\n            "
                  ),
                depthTest: !1,
                depthWrite: !1,
              })),
              (this._materialCurl = new Y.n({
                uniforms: {
                  texelSize: {
                    value: new Y.t(),
                  },
                  uVelocity: {
                    value: null,
                  },
                },
                vertexShader: a,
                fragmentShader: "\n                precision "
                  .concat(i, " float;\n                precision ")
                  .concat(
                    i,
                    " sampler2D;\n                \nuniform sampler2D uVelocity;\n\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\n\nvoid main () {\n    float L = texture2D(uVelocity, vL).y;\n    float R = texture2D(uVelocity, vR).y;\n    float T = texture2D(uVelocity, vT).x;\n    float B = texture2D(uVelocity, vB).x;\n    float vorticity = R - L - T + B;\n    gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);\n}\n\n            "
                  ),
                depthTest: !1,
                depthWrite: !1,
              })),
              (this._materialVorticity = new Y.n({
                uniforms: {
                  texelSize: {
                    value: new Y.t(),
                  },
                  uVelocity: {
                    value: null,
                  },
                  uCurl: {
                    value: null,
                  },
                  curl: {
                    value: this._curlStrength,
                  },
                  dt: {
                    value: 1 / 60,
                  },
                },
                vertexShader: n,
                fragmentShader: "\n                precision "
                  .concat(t, " float;\n                precision ")
                  .concat(
                    t,
                    " sampler2D;\n                \nuniform sampler2D uVelocity;\nuniform sampler2D uCurl;\nuniform float curl;\nuniform float dt;\n\nvarying vec2 vUv;\nvarying vec2 vL;\nvarying vec2 vR;\nvarying vec2 vT;\nvarying vec2 vB;\n\nvoid main () {\n    float L = texture2D(uCurl, vL).x;\n    float R = texture2D(uCurl, vR).x;\n    float T = texture2D(uCurl, vT).x;\n    float B = texture2D(uCurl, vB).x;\n    float C = texture2D(uCurl, vUv).x;\n    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));\n    force /= length(force) + 0.0001;\n    force *= curl * C;\n    force.y *= -1.0;\n    vec2 vel = texture2D(uVelocity, vUv).xy;\n    gl_FragColor = vec4(vel + force * dt, 0.0, 1.0);\n}\n\n            "
                  ),
                depthTest: !1,
                depthWrite: !1,
              })),
              (this._materialDivergence = new Y.n({
                uniforms: {
                  texelSize: {
                    value: new Y.t(),
                  },
                  uVelocity: {
                    value: null,
                  },
                },
                vertexShader: n,
                fragmentShader: "\n                precision "
                  .concat(i, " float;\n                precision ")
                  .concat(
                    i,
                    " sampler2D;\n                \nuniform sampler2D uVelocity;\n\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\n\nvoid main () {\n    float L = texture2D(uVelocity, vL).x;\n    float R = texture2D(uVelocity, vR).x;\n    float T = texture2D(uVelocity, vT).y;\n    float B = texture2D(uVelocity, vB).y;\n    vec2 C = texture2D(uVelocity, vUv).xy;\n\n    float div = 0.5 * (R - L + T - B);\n    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);\n}\n\n            "
                  ),
                depthTest: !1,
                depthWrite: !1,
              })),
              (this._materialPressure = new Y.n({
                uniforms: {
                  texelSize: {
                    value: new Y.t(),
                  },
                  uPressure: {
                    value: null,
                  },
                  uDivergence: {
                    value: null,
                  },
                },
                vertexShader: n,
                fragmentShader: "\n                precision "
                  .concat(i, " float;\n                precision ")
                  .concat(
                    i,
                    " sampler2D;\n                \nuniform sampler2D uPressure;\nuniform sampler2D uDivergence;\n\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\n\nvoid main () {\n    float L = texture2D(uPressure, vL).x;\n    float R = texture2D(uPressure, vR).x;\n    float T = texture2D(uPressure, vT).x;\n    float B = texture2D(uPressure, vB).x;\n    float C = texture2D(uPressure, vUv).x;\n    float divergence = texture2D(uDivergence, vUv).x;\n    float pressure = (L + R + B + T - divergence) * 0.25;\n    gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);\n}\n\n            "
                  ),
                depthTest: !1,
                depthWrite: !1,
              })),
              (this._materialGradientSubstract = new Y.n({
                uniforms: {
                  texelSize: {
                    value: new Y.t(),
                  },
                  uPressure: {
                    value: null,
                  },
                  uVelocity: {
                    value: null,
                  },
                },
                vertexShader: n,
                fragmentShader: "\n                precision "
                  .concat(i, " float;\n                precision ")
                  .concat(
                    i,
                    " sampler2D;\n                \nuniform sampler2D uPressure;\nuniform sampler2D uVelocity;\n\nvarying highp vec2 vUv;\nvarying highp vec2 vL;\nvarying highp vec2 vR;\nvarying highp vec2 vT;\nvarying highp vec2 vB;\n\nvoid main () {\n    float L = texture2D(uPressure, vL).x;\n    float R = texture2D(uPressure, vR).x;\n    float T = texture2D(uPressure, vT).x;\n    float B = texture2D(uPressure, vB).x;\n    vec2 velocity = texture2D(uVelocity, vUv).xy;\n    velocity.xy -= vec2(R - L, T - B);\n    gl_FragColor = vec4(velocity, 0.0, 1.0);\n}\n\n            "
                  ),
                depthTest: !1,
                depthWrite: !1,
              })),
              (this._materialAdvection = new Y.n({
                uniforms: {
                  texelSize: {
                    value: new Y.t(),
                  },
                  dyeTexelSize: {
                    value: new Y.t().setScalar(1 / this._dyeRes),
                  },
                  uVelocity: {
                    value: null,
                  },
                  uSource: {
                    value: null,
                  },
                  dt: {
                    value: 1 / 60,
                  },
                  dissipation: {
                    value: 1,
                  },
                },
                vertexShader: r,
                fragmentShader: "\n                precision "
                  .concat(t, " float;\n                precision ")
                  .concat(t, " sampler2D;\n                ")
                  .concat(
                    this._linear ? "" : "#define MANUAL_FILTERING",
                    "\n                \nuniform sampler2D uVelocity;\nuniform sampler2D uSource;\nuniform vec2 texelSize;\nuniform vec2 dyeTexelSize;\nuniform float dt;\nuniform float dissipation;\n\nvarying vec2 vUv;\n\nvec4 bilerp (sampler2D sam, vec2 uv, vec2 tsize) {\n    vec2 st = uv / tsize - 0.5;\n    vec2 iuv = floor(st);\n    vec2 fuv = fract(st);\n    vec4 a = texture2D(sam, (iuv + vec2(0.5, 0.5)) * tsize);\n    vec4 b = texture2D(sam, (iuv + vec2(1.5, 0.5)) * tsize);\n    vec4 c = texture2D(sam, (iuv + vec2(0.5, 1.5)) * tsize);\n    vec4 d = texture2D(sam, (iuv + vec2(1.5, 1.5)) * tsize);\n    return mix(mix(a, b, fuv.x), mix(c, d, fuv.x), fuv.y);\n}\n\nvoid main () {\n    vec4 result;\n\n    #ifdef MANUAL_FILTERING\n        vec2 coord = vUv - dt * bilerp(uVelocity, vUv, texelSize).xy * texelSize;\n        result = bilerp(uSource, coord, dyeTexelSize);\n    #else\n        vec2 coord = vUv - dt * texture2D(uVelocity, vUv).xy * texelSize;\n        result = texture2D(uSource, coord);\n    #endif\n\n    gl_FragColor.rgb = result.rgb * dissipation;\n    gl_FragColor.a = 1.0;\n}\n\n            "
                  ),
                depthTest: !1,
                depthWrite: !1,
              }));
          },
        },
        {
          key: "_createScene",
          value: function () {
            (this._scene = new Y.p()),
              (this._camera = new Y.k(-1, 1, 1, -1, 0, 1));
            var e = new Y.b();
            e.setAttribute(
              "position",
              new Y.a(
                new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
                3
              )
            ),
              e.setAttribute(
                "uv",
                new Y.a(new Float32Array([0, 0, 2, 0, 0, 2]), 2)
              ),
              (this._mesh = new Y.i(e, this._materialClear)),
              (this._mesh.frustumCulled = !1),
              this._scene.add(this._mesh);
          },
        },
        {
          key: "_update",
          value: function (e, t) {
            var n = this,
              i = t / 1e3,
              r = se.renderer.autoClear;
            (se.renderer.autoClear = !1),
              (this._aspect =
                le.globalUniforms.resolution.value.x /
                le.globalUniforms.resolution.value.y),
              this.points.forEach(function (t) {
                if (
                  (G.copy(t.position).sub(t.prevPosition),
                  0 !== Math.abs(G.x) || 0 !== Math.abs(G.y))
                ) {
                  var r = e - t.lastUpdate;
                  if (n._splatMode === I.LINE && r < 0.014) return;
                  t.velocity += 2 * G.length();
                  var o = r > 0.1;
                  (n._mesh.material = n._materialSplat),
                    (n._materialSplat.uniforms.isDye.value = !1),
                    (n._materialSplat.uniforms.uTarget.value =
                      n._velocity.read.texture),
                    (n._materialSplat.uniforms.aspectRatio.value =
                      n._aspect),
                    n._materialSplat.uniforms.point.value.copy(
                      t.position
                    ),
                    n._materialSplat.uniforms.prevPoint.value.copy(
                      o ? t.position : t.prevPosition
                    ),
                    n._materialSplat.uniforms.color.value
                      .set(G.x, G.y, 0)
                      .multiplyScalar(n._splatForce)
                      .multiplyScalar(o ? 0 : 1),
                    (n._materialSplat.uniforms.radius.value =
                      n._splatRadius * t.velocity),
                    se.renderer.setRenderTarget(n._velocity.write),
                    se.renderer.render(n._scene, n._camera),
                    n._velocity.swap(),
                    (n._materialSplat.uniforms.isDye.value = !0),
                    (n._materialSplat.uniforms.uTarget.value =
                      n._density.read.texture),
                    n._materialSplat.uniforms.color.value.setScalar(1),
                    se.renderer.setRenderTarget(n._density.write),
                    se.renderer.render(n._scene, n._camera),
                    n._density.swap(),
                    (t.lastUpdate = e),
                    t.prevPosition.copy(t.position);
                }
                (t.velocity *= K(0.9)),
                  (t.velocity = Math.min(1, t.velocity));
              }),
              (this._mesh.material = this._materialCurl),
              this._materialCurl.uniforms.texelSize.value.setScalar(
                this._simTexelSize
              ),
              (this._materialCurl.uniforms.uVelocity.value =
                this._velocity.read.texture),
              se.renderer.setRenderTarget(this._curl),
              se.renderer.render(this._scene, this._camera),
              (this._mesh.material = this._materialVorticity),
              this._materialVorticity.uniforms.texelSize.value.setScalar(
                this._simTexelSize
              ),
              (this._materialVorticity.uniforms.uVelocity.value =
                this._velocity.read.texture),
              (this._materialVorticity.uniforms.uCurl.value =
                this._curl.texture),
              (this._materialVorticity.uniforms.curl.value =
                this._curlStrength),
              (this._materialVorticity.uniforms.dt.value = i),
              se.renderer.setRenderTarget(this._velocity.write),
              se.renderer.render(this._scene, this._camera),
              this._velocity.swap(),
              (this._mesh.material = this._materialDivergence),
              this._materialDivergence.uniforms.texelSize.value.setScalar(
                this._simTexelSize
              ),
              (this._materialDivergence.uniforms.uVelocity.value =
                this._velocity.read.texture),
              se.renderer.setRenderTarget(this._divergence),
              se.renderer.render(this._scene, this._camera),
              (this._mesh.material = this._materialClear),
              (this._materialClear.uniforms.uTexture.value =
                this._pressure.read.texture),
              (this._materialClear.uniforms.value.value = K(
                this._pressureDissipation
              )),
              se.renderer.setRenderTarget(this._pressure.write),
              se.renderer.render(this._scene, this._camera),
              this._pressure.swap(),
              (this._mesh.material = this._materialPressure),
              this._materialPressure.uniforms.texelSize.value.setScalar(
                this._simTexelSize
              ),
              (this._materialPressure.uniforms.uDivergence.value =
                this._divergence.texture);
            for (var o = 0; o < this._pressureIterations; o++)
              (this._materialPressure.uniforms.uPressure.value =
                this._pressure.read.texture),
                se.renderer.setRenderTarget(this._pressure.write),
                se.renderer.render(this._scene, this._camera),
                this._pressure.swap();
            (this._mesh.material = this._materialGradientSubstract),
              this._materialGradientSubstract.uniforms.texelSize.value.setScalar(
                this._simTexelSize
              ),
              (this._materialGradientSubstract.uniforms.uPressure.value =
                this._pressure.read.texture),
              (this._materialGradientSubstract.uniforms.uVelocity.value =
                this._velocity.read.texture),
              se.renderer.setRenderTarget(this._velocity.write),
              se.renderer.render(this._scene, this._camera),
              this._velocity.swap(),
              (this._mesh.material = this._materialAdvection),
              this._materialAdvection.uniforms.texelSize.value.setScalar(
                this._simTexelSize
              ),
              this._materialAdvection.uniforms.dyeTexelSize.value.setScalar(
                this._simTexelSize
              ),
              (this._materialAdvection.uniforms.uVelocity.value =
                this._velocity.read.texture),
              (this._materialAdvection.uniforms.uSource.value =
                this._velocity.read.texture),
              (this._materialAdvection.uniforms.dt.value = i),
              (this._materialAdvection.uniforms.dissipation.value = K(
                this._velocityDissipation
              )),
              se.renderer.setRenderTarget(this._velocity.write),
              se.renderer.render(this._scene, this._camera),
              this._velocity.swap(),
              this._materialAdvection.uniforms.dyeTexelSize.value.setScalar(
                this._dyeTexelSize
              ),
              (this._materialAdvection.uniforms.uVelocity.value =
                this._velocity.read.texture),
              (this._materialAdvection.uniforms.uSource.value =
                this._density.read.texture),
              (this._materialAdvection.uniforms.dissipation.value = K(
                this._densityDissipation
              )),
              se.renderer.setRenderTarget(this._density.write),
              se.renderer.render(this._scene, this._camera),
              this._density.swap(),
              (se.renderer.autoClear = r),
              (this.dyeUniform.value = this._density.read.texture),
              (this.velUniform.value = this._velocity.read.texture);
          },
        },
        {
          key: "_moveFinger",
          value: function (e) {
            this.points[0].position.copy(e);
          },
        },
        {
          key: "enable",
          value: function () {
            this._enabled ||
              ((this._enabled = !0),
              l.on("beforerender", this._update, this),
              l.on("touch", this._moveFinger, this));
          },
        },
      ]),
      e
    );
  })(),
  Q = n(122),
  J = n(195),
  X = (n(87), n(38)),
  Z = n(4),
  ee = n(2),
  te = n(88),
  ne = n(318);

function re(e, t, n) {
  return (
    (t = Object(Z.a)(t)),
    Object(X.a)(
      e,
      ie()
        ? Reflect.construct(t, n || [], Object(Z.a)(e).constructor)
        : t.apply(e, n)
    )
  );
}

function ie() {
  try {
    var e = !Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {})
    );
  } catch (e) {}
  return (ie = function () {
    return !!e;
  })();
}
var oe = (function (e) {
    function t() {
      var e;
      Object(c.a)(this, t), (e = re(this, t, [ne.a]));
      var n = function () {
        e.material.uniforms.resolution.value
          .setScalar(1)
          .divide(le.globalUniforms.resolution.value);
      };
      return l.on("resize", n), n(), e;
    }
    return Object(ee.a)(t, e), Object(v.a)(t);
  })(te.a),
  ae = {
    container: null,
    renderer: null,
    renderPass: null,
    init: function () {
      var e = (
          arguments.length > 0 && void 0 !== arguments[0]
            ? arguments[0]
            : {}
        ).container,
        t = "#uniforms" === window.location.hash;
      this.container = e;
      var n = new Y.x({
        alpha: !1,
        antialias: !1,
        preserveDrawingBuffer: t,
      });
      (this.renderer = n),
        n.setClearColor(new Y.d("#000000")),
        n.setClearAlpha(1);
      var r = new Y.l(45, z.screen.width / z.screen.height, 0.1, 1e3);
      (this.camera = r),
        (n.capabilities.writeFloatTexture =
          this.checkWriteFloatTexture()),
        this.container.prepend(n.domElement),
        (n.debug.checkShaderErrors = !1),
        (n.capabilities.floatGPGPU = "safari" !== z.browser);
      var rt = new Y.w(2, 2, {
        minFilter: Y.h,
        magFilter: Y.h,
        format: Y.m,
      });
      rt.texture.name = "EffectComposer.rt1";
      var o = new Q.a(n, rt);
      o.renderToScreen = !0;
      var c = new Y.p(),
        v = new J.a(c, r, void 0, new Y.d("#000000"), 1);
      o.addPass(v), (this.renderPass = v);
      var h = new oe();
      (h.renderToScreen = !0), o.addPass(h);
      var d = function (e, t) {
        var l = le.globalUniforms.resolution.value,
          c = le.globalUniforms.resolution2.value;
        n.setSize(c.x, c.y, !1),
          o.setSize(l.x, l.y),
          (n.domElement.style.width = "".concat(e, "px")),
          (n.domElement.style.height = "".concat(t, "px")),
          (r.aspect = l.x / l.y),
          r.updateProjectionMatrix();
      };
      d(),
        l.on("resize", d),
        l.on("render", function (time, e) {
          o.render(e);
        });
      var f = document.querySelector("#__nuxt"),
        m = new Y.t(),
        track = function (e) {
          var t,
            n =
              (null === (t = e.touches) || void 0 === t
                ? void 0
                : t.length) > 0
                ? e.touches[0]
                : e,
            r = n.clientX,
            o = n.clientY;
          m.set(r, o),
            (m.x /= z.screen.width),
            (m.y /= z.screen.height),
            (m.y = 1 - m.y),
            l.emit("touch", m);
        };
      f.addEventListener("pointerdown", track),
        f.addEventListener("pointermove", track),
        f.addEventListener("touchstart", track),
        f.addEventListener("touchmove", track),
        t &&
          f.addEventListener("click", function () {
            var e,
              t = "image/octet-stream";
            try {
              var r = "image/jpeg";
              (e = n.domElement.toDataURL(r)),
                y(
                  e.replace(r, t),
                  "".concat(Math.round(1e3 * Math.random()), ".jpg")
                );
            } catch (e) {
              console.log(e);
            }
          });
      var y = function (e, t) {
        var link = document.createElement("a");
        "string" == typeof link.download &&
          (document.body.appendChild(link),
          (link.download = t),
          (link.href = e),
          link.click(),
          document.body.removeChild(link));
      };
    },
    checkWriteFloatTexture: function () {
      if (
        !this.renderer.capabilities.isWebGL2 &&
        !this.renderer.extensions.get("OES_texture_float")
      )
        return !1;
      var rt = new Y.w(1, 1, {
          minFilter: Y.j,
          magFilter: Y.j,
          format: Y.m,
          type: Y.f,
        }),
        e = new Y.p(),
        t = new Y.b();
      t.setAttribute(
        "position",
        new Y.a(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
      ),
        t.setAttribute(
          "uv",
          new Y.a(new Float32Array([0, 0, 2, 0, 0, 2]), 2)
        ),
        e.add(
          new Y.i(
            t,
            new Y.q({
              vertexShader:
                " void main() { gl_Position = vec4(position, 1.0); } ",
              fragmentShader:
                " void main() { gl_FragColor.rgb = vec3(0.0, 1.0 / 10.0, 1.0 / 20.0); gl_FragColor.a = 1.0; } ",
            })
          )
        ),
        this.renderer.setRenderTarget(rt),
        this.renderer.render(e, this.camera);
      var n = new Float32Array(4);
      return (
        this.renderer.readRenderTargetPixels(rt, 0, 0, 1, 1, n),
        !(0 !== n[0] || n[1] < 0.1 || n[2] < 0.05 || n[3] < 1)
      );
    },
  },
  se = ae,
  ue = {
    globalUniforms: {
      resolution: {
        value: new Y.t(2, 2),
        global: !0,
      },
      resolution2: {
        value: new Y.t(2, 2),
        global: !0,
      },
      time: {
        value: 0,
        global: !0,
      },
    },
    physicsUniforms: {
      dtRatio: {
        value: 1,
        global: !0,
      },
    },
  };
l.on("resize", function (e, t) {
  var n = "safari" === z.browser && z.screen.width > 1100;
  ue.globalUniforms.resolution.value
    .set(e, t)
    .multiplyScalar(Math.min(window.devicePixelRatio, n ? 1 : 1.5) || 1)
    .floor(),
    ue.globalUniforms.resolution2.value
      .set(e, t)
      .multiplyScalar(
        Math.max(window.devicePixelRatio, n ? 1 : 1.25) || 1
      )
      .floor();
}),
  l.on("render", function (time) {
    (ue.globalUniforms.time.value = time),
      (ue.physicsUniforms.dtRatio.value = r.a.ticker.ratio());
  });
var le = ue;
},
194: function (e, t, n) {
"use strict";
var r = n(14),
  o = (n(44), n(37), n(62)),
  l = n.n(o);

function c() {
  return (c = Object(r.a)(
    regeneratorRuntime.mark(function e() {
      var video;
      return regeneratorRuntime.wrap(
        function (e) {
          for (;;)
            switch ((e.prev = e.next)) {
              case 0:
                if (!l.a.isIos) {
                  e.next = 17;
                  break;
                }
                return (
                  (video = document.createElement("video")).setAttribute(
                    "playsinline",
                    "playsinline"
                  ),
                  video.setAttribute("aria-hidden", !0),
                  video.setAttribute("src", ""),
                  (e.prev = 5),
                  (e.next = 8),
                  video.play()
                );
              case 8:
                e.next = 14;
                break;
              case 10:
                if (
                  ((e.prev = 10),
                  (e.t0 = e.catch(5)),
                  "NotAllowedError" !== e.t0.name)
                ) {
                  e.next = 14;
                  break;
                }
                return e.abrupt("return", !0);
              case 14:
                return (e.prev = 14), (video = null), e.finish(14);
              case 17:
                return e.abrupt("return", !1);
              case 18:
              case "end":
                return e.stop();
            }
        },
        e,
        null,
        [[5, 10, 14, 17]]
      );
    })
  )).apply(this, arguments);
}
t.a = function () {
  return c.apply(this, arguments);
};
},
239: function (e, t, n) {
"use strict";
t.a = function (e) {
  var t = e.query,
    n = e.enablePreview;
  t.preview && n();
};
},
240: function (e, t, n) {
"use strict";
var r = n(14),
  o = (n(44), n(90), n(19)),
  l = n(323),
  c = n.n(l),
  v = n(324),
  h = n.n(v),
  d = n(242),
  f = n.n(d),
  m = n(321),
  y = n.n(m),
  x = (n(11), n(16)),
  w = n(0),
  _ = n(1),
  C =
    (n(143),
    n(144),
    n(145),
    n(146),
    n(147),
    n(148),
    n(149),
    n(150),
    n(151),
    n(152),
    n(153),
    n(154),
    n(155),
    n(156),
    n(157),
    n(158),
    n(159),
    n(160),
    n(161),
    n(162),
    n(163),
    n(164),
    n(165),
    n(166),
    n(167),
    n(3)),
  O = n(195),
  S = n(122),
  P = (n(87), n(38)),
  A = n(4),
  j = n(2),
  D = (n(28), n(34), n(39), n(40), n(31), n(25), n(9)),
  R = n(322),
  k = n(88);

function M(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      n.push.apply(n, r);
  }
  return n;
}

function B(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? M(Object(n), !0).forEach(function (t) {
          Object(D.a)(e, t, n[t]);
        })
      : Object.getOwnPropertyDescriptors
      ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
      : M(Object(n)).forEach(function (t) {
          Object.defineProperty(
            e,
            t,
            Object.getOwnPropertyDescriptor(n, t)
          );
        });
  }
  return e;
}

function T(e, t, n) {
  return (
    (t = Object(A.a)(t)),
    Object(P.a)(
      e,
      U()
        ? Reflect.construct(t, n || [], Object(A.a)(e).constructor)
        : t.apply(e, n)
    )
  );
}

function U() {
  try {
    var e = !Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {})
    );
  } catch (e) {}
  return (U = function () {
    return !!e;
  })();
}
var L = (function (e) {
  function t() {
    return (
      Object(w.a)(this, t),
      T(this, t, [
        new C.q({
          uniforms: B(
            B(
              {
                tDiffuse: {
                  value: null,
                },
                tVel: x.g.fluidSim.velUniform,
              },
              x.h.globalUniforms
            ),
            x.h.physicsUniforms
          ),
          vertexShader:
            "\n                //- edit\n\n                varying vec2 vUv;\n\n                void main() {\n                    vUv = uv;\n                    gl_Position = vec4(position, 1.0);\n                }\n            ",
          fragmentShader:
            "\n                //- edit\n                uniform float dtRatio;\n                uniform sampler2D tDiffuse;\n                uniform sampler2D tVel;\n\n                varying vec2 vUv;\n\n                void main() {\n                    vec2 vel = texture2D(tVel, vUv).rg;\n                    vec4 prev = texture2D(tDiffuse, vUv);\n\n                    vec2 prevUV = prev.rg;\n                    vec2 prevVel = prev.ba;\n\n                    vec2 disp = vUv - prevUV;\n                    vec2 dispNor = clamp(normalize(disp), vec2(-1.0), vec2(1.0));\n                    float len = length(disp);\n\n                    prevVel += dispNor * (len * 0.03) * dtRatio;\n                    prevVel += vel * -0.00002 * dtRatio;\n\n                    prevVel *= exp2(log2(0.925) * dtRatio);\n\n                    prevUV += prevVel * dtRatio;\n\n                    gl_FragColor = vec4(prevUV.x, prevUV.y, prevVel.x, prevVel.y);\n                }\n             ",
          depthWrite: !0,
          depthTest: !1,
        }),
      ])
    );
  }
  return Object(j.a)(t, e), Object(_.a)(t);
})(k.a);

function E(e, t, n) {
  return (
    (t = Object(A.a)(t)),
    Object(P.a)(
      e,
      F()
        ? Reflect.construct(t, n || [], Object(A.a)(e).constructor)
        : t.apply(e, n)
    )
  );
}

function F() {
  try {
    var e = !Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {})
    );
  } catch (e) {}
  return (F = function () {
    return !!e;
  })();
}
var N = (function (e) {
  function t() {
    return (
      Object(w.a)(this, t),
      E(this, t, [
        new C.q({
          uniforms: {},
          vertexShader:
            "\n\n                varying vec2 vUv;\n\n                void main() {\n                    vUv = uv;\n                    gl_Position = vec4(position, 1.0);\n                }\n            ",
          fragmentShader:
            "\n\n                varying vec2 vUv;\n\n                void main() {\n                    gl_FragColor = vec4(vUv, 0.0, 0.0);\n                }\n             ",
          depthWrite: !0,
          depthTest: !1,
        }),
      ])
    );
  }
  return Object(j.a)(t, e), Object(_.a)(t);
})(k.a);

function z(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      n.push.apply(n, r);
  }
  return n;
}

function V(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? z(Object(n), !0).forEach(function (t) {
          Object(D.a)(e, t, n[t]);
        })
      : Object.getOwnPropertyDescriptors
      ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
      : z(Object(n)).forEach(function (t) {
          Object.defineProperty(
            e,
            t,
            Object.getOwnPropertyDescriptor(n, t)
          );
        });
  }
  return e;
}
var Y = (function () {
  function e(t) {
    Object(w.a)(this, e),
      (this.scene = t),
      this.createElastic(),
      this.init();
  }
  return (
    Object(_.a)(e, [
      {
        key: "createElastic",
        value: function () {
          var e = this,
            rt = new C.w(2, 2, {
              minFilter: C.j,
              magFilter: C.j,
              format: C.m,
              type: x.g.renderer.capabilities.writeFloatTexture
                ? C.f
                : C.g,
            }),
            t = new S.a(x.g.renderer, rt);
          (this.elasticComposer = t),
            (t.renderToScreen = !1),
            (this.elasticPass = new L()),
            (this.uvPass = new N());
          var n = x.h.globalUniforms.resolution.value,
            r = function () {
              t.setSize(n.x, n.y),
                t.removePass(e.elasticPass),
                t.addPass(e.uvPass),
                t.render(),
                t.render(),
                t.removePass(e.uvPass),
                t.addPass(e.elasticPass);
            };
          x.c.on("resize", r), r();
        },
      },
      {
        key: "init",
        value: function () {
          var e = this,
            t = new C.r().load(
              "".concat(window.location.origin, "/images/bg4.png")
            );
          (t.wrapS = C.o), (t.wrapT = C.o);
          var n = new C.r().load(
              "".concat(window.location.origin, "/images/logo.png")
            ),
            r = [0, 1, 2, 3];
          this.material = new C.q({
            extensions: {
              derivatives: !0,
            },
            uniforms: V(
              {
                tBg: {
                  value: t,
                },
                tLogo: {
                  value: n,
                },
                uColorBg: {
                  value: new C.d("#000"),
                },
                uColorLogo: {
                  value: new C.d("#fff"),
                },
                uNoise: {
                  value: r[Math.floor(Math.random() * r.length)],
                },
                uNoise1Opts: {
                  value: new C.t(1.25, 0.25),
                },
                uNoise2Opts: {
                  value: new C.t(2, 0.8),
                },
                uNoise3Opts: {
                  value: new C.u(5, 2, 3.8),
                },
                uNoise4Opts: {
                  value: new C.v(-3.8, -2, -3.9, -2.5),
                },
                uGlobalShape: {
                  value: 0,
                },
                uGlobalOpen: {
                  value: 0,
                },
                uNoiseMultiplier: {
                  value: 0,
                },
                uDye: x.g.fluidSim.dyeUniform,
                uVel: x.g.fluidSim.velUniform,
                uUV: {
                  value: this.elasticComposer.readBuffer.texture,
                },
                uLogoAnimation: {
                  value: 0,
                },
              },
              x.h.globalUniforms
            ),
            vertexShader:
              "\n                //- edit\n                varying vec2 vUv;\n\n                void main() {\n                    vUv = uv;\n                    gl_Position = vec4(position, 1.0);\n                }\n            ",
            fragmentShader:
              '\n                //- edit\n\n                uniform vec3 uColorBg;\n                uniform vec2 resolution;\n                uniform float uLogoAnimation;\n                uniform vec3 uColorLogo;\n                uniform float uNoise;\n                uniform sampler2D tBg;\n                uniform sampler2D uDye;\n                uniform sampler2D uVel;\n                uniform sampler2D tLogo;\n                uniform sampler2D uUV;\n                uniform vec2 uNoise1Opts;\n                uniform vec2 uNoise2Opts;\n                uniform vec3 uNoise3Opts;\n                uniform vec4 uNoise4Opts;\n                uniform float uGlobalShape;\n                uniform float uGlobalOpen;\n                uniform float uNoiseMultiplier;\n                uniform float time;\n\n                varying vec2 vUv;\n\n                vec2 rotateUV(vec2 uv, float rotation, vec2 mid) {\n                    return vec2(\n                        cos(rotation) * (uv.x - mid.x) + sin(rotation) * (uv.y - mid.y) + mid.x,\n                        cos(rotation) * (uv.y - mid.y) - sin(rotation) * (uv.x - mid.x) + mid.y\n                    );\n                }\n\n                vec2 scaleUV(vec2 uv, float scale, vec2 mid) {\n                    uv -= mid;\n                    uv *= 1.0 / scale;\n                    uv += mid;\n                    return uv;\n                }\n\n                float cubicInOut(float t) {\n                    return t < 0.5\n                        ? 4.0 * t * t * t\n                        : 0.5 * pow(2.0 * t - 2.0, 3.0) + 1.0;\n                }\n\n                float quadraticInOut(float t) {\n                    float p = 2.0 * t * t;\n                    return t < 0.5 ? p : -p + (4.0 * t) - 1.0;\n                }\n\n                float quadraticOut(float t) {\n                    return -t * (t - 2.0);\n                }\n\n                float ft(float x, float a1, float a2, float b1, float b2) {\n                    return b1 + ((x - a1) * (b2 - b1)) / (a2 - a1);\n                }\n\n                float fc(float x, float a1, float a2, float b1, float b2) {\n                    return clamp(ft(x, a1, a2, b1, b2), min(b1, b2), max(b1, b2));\n                }\n\n                float stp(float a, float b, float t) {\n                    return clamp((t - a) / (b - a), 0.0, 1.0);\n                }\n\n                float fl(float a, float b, float c, float f, float e) {\n                    float p = mix(b - f, c, e);\n                    return stp(p + f, p, a);\n                }\n\n                vec3 hash(vec3 p3) {\n                    p3 = fract(p3 * vec3(.1031, .1030, .0973));\n                    p3 += dot(p3, p3.yxz+33.33);\n                    return fract((p3.xxy + p3.yxx)*p3.zyx) - 0.5;\n                }\n\n                vec2 hash22(vec2 p) {\n                    vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));\n                    p3 += dot(p3, p3.yzx+33.33);\n                    return fract((p3.xx+p3.yz)*p3.zy);\n                }\n\n                float noise(in vec3 p) {\n                    const float K1 = 0.333333333;\n                    const float K2 = 0.166666667;\n\n                    vec3 i = floor(p + (p.x + p.y + p.z) * K1);\n                    vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);\n                    vec3 e = step(vec3(0.0), d0 - d0.yzx);\n                    vec3 i1 = e * (1.0 - e.zxy);\n                    vec3 i2 = 1.0 - e.zxy * (1.0 - e);\n                    vec3 d1 = d0 - (i1 - 1.0 * K2);\n                    vec3 d2 = d0 - (i2 - 2.0 * K2);\n                    vec3 d3 = d0 - (1.0 - 3.0 * K2);\n                    vec4 h = max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);\n                    vec4 n = h * h * h * h * vec4(dot(d0, hash(i)), dot(d1, hash(i + i1)), dot(d2, hash(i + i2)), dot(d3, hash(i + 1.0)));\n                    return dot(n, vec4(52.0));\n                }\n\n                float cellNoise(in vec2 uv, in float aspect) {\n                    uv -= 0.5;\n                    uv.x *= aspect;\n                    uv += 0.5;\n                    uv *= uNoise2Opts.x;\n\n                    vec2 i_st = floor(uv);\n                    vec2 f_st = fract(uv);\n\n                    float m_dist = 1.;\n\n                    for (int y= -1; y <= 1; y++) {\n                        for (int x= -1; x <= 1; x++) {\n                            vec2 neighbor = vec2(float(x),float(y));\n                            vec2 point = hash22(i_st + neighbor);\n                            point = 0.5 + 0.5*sin(time * uNoise2Opts.y + 6.2831*point);\n                            vec2 diff = neighbor + point - f_st;\n                            float dist = length(diff);\n                            m_dist = min(m_dist, dist);\n                        }\n                    }\n\n                    return m_dist;\n                }\n\n                float linearNoise(in vec2 uv, in float aspect) {\n                    uv -= 0.5;\n                    uv.x *= aspect;\n                    uv += 0.5;\n                    uv = rotateUV(uv, uNoise3Opts.z, vec2(0.5));\n                    uv *= uNoise3Opts.x;\n                    return (sin(uv.x + time * uNoise3Opts.y) + 1.0) * 0.5;\n                }\n\n                float linearNoise2(in vec2 uv, in float aspect) {\n                    uv = rotateUV(uv, uNoise4Opts.z, vec2(0.5));\n                    vec2 multX = rotateUV(vec2(aspect + uNoise4Opts.w * aspect, 1.0), uNoise4Opts.z, vec2(0.0));\n                    uv -= 0.5;\n                    uv *= multX;\n                    float len = (sin(length(uv) * uNoise4Opts.x + time * uNoise4Opts.y) + 1.0) * 0.5;\n                    return len;\n                }\n\n                void main() {\n                    float ww = fwidth(vUv.y);\n                    float aspect = resolution.x / resolution.y;\n\n                    vec2 bgUV = texture2D(uUV, vUv).rg;\n\n                    vec2 vel = texture2D(uVel, bgUV).rg * -0.001 * uNoiseMultiplier;\n                    float dye = fc(quadraticOut(texture2D(uDye, bgUV).r), 0.01, 1.0, 0.0, 0.6);\n\n                    float n1 = 0.0;\n\n                    if (uNoise < 1.0) {\n                        n1 = quadraticInOut(fc(noise(vec3(bgUV * uNoise1Opts.x + 24.143, time * uNoise1Opts.y + 65.343)), -0.2, 0.7, 0.0, 0.6));\n                    } else if (uNoise < 2.0) {\n                        n1 = fc(cellNoise(vUv, aspect), 0.4, 0.8, 0.0, 0.6);\n                    } else if (uNoise < 3.0) {\n                        n1 = quadraticInOut(fc(linearNoise(vUv, aspect), 0.0, 1.0, 0.0, 0.4));\n                    } else {\n                        n1 = quadraticInOut(fc(linearNoise2(vUv, aspect), 0.0, 1.0, 0.0, 0.4));\n                    }\n\n                    n1 *= uNoiseMultiplier;\n\n                    /*\n\n                    logo\n\n                    */\n\n                    vec2 uvLogo = bgUV;\n\n                    // normalize uv\n                    uvLogo -= 0.5;\n                    uvLogo.x *= aspect;\n                    uvLogo += 0.5;\n                    uvLogo = scaleUV(uvLogo, min(resolution.x, resolution.y) * 0.00025 + ww * 300.0, vec2(0.5));\n\n                    // merge the logo and the background\n                    vec2 dLogo = 1.0 - texture2D(tLogo, uvLogo).rg;\n                    float borderLogo = ww + 0.0175;\n\n                    // add the noise to the logo to "disolve" it\n                    float logoDF = dLogo.r + n1;\n\n\n                    float shapeInside = fl(logoDF, 0.15, 1.0, borderLogo, fc(uLogoAnimation, 0.0, 1.0, 0.01, 0.85));\n                    vec3 bg = mix(uColorBg, uColorLogo, shapeInside);\n\n\n                    /*\n\n                    bg\n\n                    */\n\n                    // normalize uv\n                    vec2 uv = bgUV;\n                    uv -= 0.5;\n                    uv.x *= aspect;\n                    uv += 0.5;\n                    uv = scaleUV(uv, resolution.y * 0.00003 +  ww * 20.0, vec2(0.5));\n\n                    // get sdf\n                    float dist = 1.0 - texture2D(tBg, uv).r;\n\n                    // get mix\n                    float diff = 0.075;\n\n                    diff += n1;\n                    diff += uGlobalOpen;\n                    diff += dye * uNoiseMultiplier;\n                    diff *= uGlobalShape;\n\n                    float border = ww + 0.0175;\n                    float shape = fl(dist, 0.0, 1.0, border, fc(diff, 0.0, 1.0, 0.0, 1.0));\n\n                    vec3 colorFront = mix(uColorLogo, uColorBg, shapeInside * dye * 3.0);\n\n                    bg = mix(bg, colorFront, shape);\n\n\n                    gl_FragColor.rgb = bg;\n                    gl_FragColor.a = 1.0;\n                }\n            ',
            transparent: !1,
          });
          var o = new C.b();
          o.setAttribute(
            "position",
            new C.a(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)
          ),
            o.setAttribute(
              "uv",
              new C.a(new Float32Array([0, 0, 2, 0, 0, 2]), 2)
            ),
            (this.mesh = new C.i(o, this.material)),
            (this.mesh.frustumCulled = !1),
            (this.mesh.onBeforeRender = function (t) {
              e.elasticComposer.render(),
                (e.material.uniforms.uUV.value =
                  e.elasticComposer.readBuffer.texture);
            }),
            this.scene.add(this.mesh),
            "#uniforms" === window.location.hash && this.addPane();
        },
      },
      {
        key: "addPane",
        value: function () {
          var e = this,
            t = new R.Pane({
              title: "options",
              expanded: !0,
            });
          Object.assign(t.containerElem_.style, {
            position: "fixed",
          });
          var n = {
            uColorBg: "#".concat(
              this.material.uniforms.uColorBg.value.clone().getHexString()
            ),
            uColorLogo: "#".concat(
              this.material.uniforms.uColorLogo.value
                .clone()
                .getHexString()
            ),
            uNoise: this.material.uniforms.uNoise.value,
            uNoise1Opts: {
              x: this.material.uniforms.uNoise1Opts.value.x,
              y: this.material.uniforms.uNoise1Opts.value.y,
            },
            uNoise2Opts: {
              x: this.material.uniforms.uNoise2Opts.value.x,
              y: this.material.uniforms.uNoise2Opts.value.y,
            },
            uNoise3Opts: {
              x: this.material.uniforms.uNoise3Opts.value.x,
              y: this.material.uniforms.uNoise3Opts.value.y,
              z: this.material.uniforms.uNoise3Opts.value.z,
            },
            uNoise4Opts: {
              x: this.material.uniforms.uNoise4Opts.value.x,
              y: this.material.uniforms.uNoise4Opts.value.y,
              z: this.material.uniforms.uNoise4Opts.value.z,
              w: this.material.uniforms.uNoise4Opts.value.w,
            },
          };
          t.addInput(n, "uColorBg").on("change", function (t) {
            e.material.uniforms.uColorBg.value.setStyle(t.value);
          }),
            t.addInput(n, "uColorLogo").on("change", function (t) {
              e.material.uniforms.uColorLogo.value.setStyle(t.value);
            }),
            t.addInput(n, "uNoise").on("change", function (t) {
              e.material.uniforms.uNoise.value = t.value;
            }),
            t.addInput(n, "uNoise1Opts").on("change", function (t) {
              e.material.uniforms.uNoise1Opts.value.copy(t.value);
            }),
            t.addInput(n, "uNoise2Opts").on("change", function (t) {
              e.material.uniforms.uNoise2Opts.value.copy(t.value);
            }),
            t.addInput(n, "uNoise3Opts").on("change", function (t) {
              e.material.uniforms.uNoise3Opts.value.copy(t.value);
            }),
            t.addInput(n, "uNoise4Opts").on("change", function (t) {
              e.material.uniforms.uNoise4Opts.value.copy(t.value);
            });
        },
      },
    ]),
    e
  );
})();

function $(e, t, n) {
  return (
    (t = Object(A.a)(t)),
    Object(P.a)(
      e,
      I()
        ? Reflect.construct(t, n || [], Object(A.a)(e).constructor)
        : t.apply(e, n)
    )
  );
}

function I() {
  try {
    var e = !Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {})
    );
  } catch (e) {}
  return (I = function () {
    return !!e;
  })();
}
var G = (function (e) {
  function t() {
    var e;
    Object(w.a)(this, t), (e = $(this, t));
    var n = new C.l(45, x.b.screen.width / x.b.screen.height, 0.1, 1e3);
    n.position.set(0, 0, 5);
    var r = function (e, t) {
      var r = x.h.globalUniforms.resolution.value;
      (n.aspect = r.x / r.y), n.updateProjectionMatrix();
    };
    return x.c.on("resize", r), r(), e.createBg1(), e;
  }
  return (
    Object(j.a)(t, e),
    Object(_.a)(t, [
      {
        key: "createBg1",
        value: function () {
          this.bg1 = new Y(this);
        },
      },
    ]),
    t
  );
})(C.p);

function K(e, t) {
  var n = Object.keys(e);
  if (Object.getOwnPropertySymbols) {
    var r = Object.getOwnPropertySymbols(e);
    t &&
      (r = r.filter(function (t) {
        return Object.getOwnPropertyDescriptor(e, t).enumerable;
      })),
      n.push.apply(n, r);
  }
  return n;
}

function H(e) {
  for (var t = 1; t < arguments.length; t++) {
    var n = null != arguments[t] ? arguments[t] : {};
    t % 2
      ? K(Object(n), !0).forEach(function (t) {
          Object(D.a)(e, t, n[t]);
        })
      : Object.getOwnPropertyDescriptors
      ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(n))
      : K(Object(n)).forEach(function (t) {
          Object.defineProperty(
            e,
            t,
            Object.getOwnPropertyDescriptor(n, t)
          );
        });
  }
  return e;
}

function W(e, t, n) {
  return (
    (t = Object(A.a)(t)),
    Object(P.a)(
      e,
      Q()
        ? Reflect.construct(t, n || [], Object(A.a)(e).constructor)
        : t.apply(e, n)
    )
  );
}

function Q() {
  try {
    var e = !Boolean.prototype.valueOf.call(
      Reflect.construct(Boolean, [], function () {})
    );
  } catch (e) {}
  return (Q = function () {
    return !!e;
  })();
}
var J,
  X = (function (e) {
    function t() {
      return (
        Object(w.a)(this, t),
        W(this, t, [
          {
            uniforms: H(
              {
                tScene: {
                  value: null,
                },
              },
              x.h.globalUniforms
            ),
            vertexShader:
              "\n\n                varying vec2 vUv;\n\n                void main() {\n                    vUv = uv;\n                    gl_Position = vec4(position, 1.0);\n                }\n            ",
            fragmentShader:
              "\n\n                uniform sampler2D tScene;\n                varying vec2 vUv;\n\n                void main() {\n                    vec2 uv = vUv;\n                    vec3 scene = texture2D(tScene, uv).rgb;\n\n                    gl_FragColor = vec4(scene, 1.0);\n                }\n            ",
            depthTest: !1,
            depthWrite: !1,
          },
        ])
      );
    }
    return Object(j.a)(t, e), Object(_.a)(t);
  })(C.q),
  Z = (function () {
    function e() {
      Object(w.a)(this, e),
        this.initGlobalPlane(),
        this.initScenes(),
        (this.mainUniforms = this.bgScene.bg1.material.uniforms);
    }
    return (
      Object(_.a)(e, [
        {
          key: "initGlobalPlane",
          value: function () {
            var e = this,
              t = new C.b();
            t.setAttribute(
              "position",
              new C.a(
                new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]),
                3
              )
            ),
              t.setAttribute(
                "uv",
                new C.a(new Float32Array([0, 0, 2, 0, 0, 2]), 2)
              ),
              (this.material = new X()),
              (this.mainMesh = new C.i(t, this.material)),
              (this.mainMesh.frustumCulled = !1),
              x.g.renderPass.scene.add(this.mainMesh),
              (this.mainMesh.onBeforeRender = function () {
                e.render();
              });
          },
        },
        {
          key: "initScenes",
          value: function () {
            this.bgScene = new G();
            var e = new S.a(x.g.renderer);
            (this.bgComposer = e), (e.renderToScreen = !1);
            var t = new C.l(
                45,
                x.b.screen.width / x.b.screen.height,
                0.1,
                1e3
              ),
              n = x.h.globalUniforms.resolution.value;
            (e.__resize = function () {
              e.setSize(n.x, n.y),
                (t.aspect = n.x / n.y),
                t.updateProjectionMatrix();
            }),
              x.c.on("resize", e.__resize),
              e.__resize(),
              (this.bgPass = new O.a(this.bgScene, t)),
              this.bgComposer.addPass(this.bgPass);
          },
        },
        {
          key: "render",
          value: function () {
            this.bgComposer.render(),
              (this.material.uniforms.tScene.value =
                this.bgComposer.readBuffer.texture);
          },
        },
      ]),
      e
    );
  })(),
  ee = {
    container: null,
    ready: new Promise(function (e) {
      J = e;
    }),
    init: function (e) {
      Object(x.f)(),
        x.c.once("webgl_start", this.start, this),
        x.c.emit("webgl_ready"),
        x.c.emit("webgl_start", {
          container: e,
        });
    },
    start: function (e) {
      e && e.container
        ? (this.container = e.container)
        : ((this.container = document.createElement("div")),
          (this.container.id = "app"),
          document.body.prepend(this.container)),
        x.a.create("io", "M0,0 C0.6,0 0,1 1,1"),
        x.g.init({
          container: this.container,
        }),
        (x.g.fluidSim = new x.d({
          borders: !1,
          simRes: 128,
          dyeRes: 128,
          curlStrength: 0.001,
          splatRadius: "desktop" === x.b.device ? 0.25 : 0.175,
          splatForce: 500,
          pressureIterations: 2,
          densityDissipation: 0.93,
          velocityDissipation: 0.97,
          pressureDissipation: 0.8,
        })),
        (this.main = new Z()),
        J();
    },
  },
  te = new ((function () {
    function e() {
      Object(w.a)(this, e),
        (this.PERF = 0),
        (this.PERFS = {
          PERF_BAD: 0,
          PERF_LOW: 1,
          PERF_GOOD: 2,
          PERF_HIGH: 3,
        });
    }
    return (
      Object(_.a)(e, [
        {
          key: "getPerfs",
          value: function () {
            var e = this;
            return new Promise(function (t) {
              for (
                var n = e.PERFS.PERF_BAD,
                  r = (window.performance || Date).now(),
                  i = 0;
                i < 2e4;
                i++
              )
                Math.pow(Math.sin(Math.random()), 2);
              var o,
                l,
                c,
                v = (window.performance || Date).now() - r;
              (o = window.navigator.userAgent),
                (l = o.indexOf("MSIE ")),
                (c = o.indexOf("Trident/")),
                (n =
                  l > 0 || c > 0
                    ? e.PERFS.PERF_BAD
                    : v < 7
                    ? e.PERFS.PERF_HIGH
                    : v < 14
                    ? e.PERFS.PERF_GOOD
                    : v < 22
                    ? e.PERFS.PERF_LOW
                    : e.PERFS.PERF_BAD),
                (e.PERF = n),
                t();
            });
          },
        },
      ]),
      e
    );
  })())(),
  ne = n(109);
t.a = function (e, t) {
  return re.apply(this, arguments);
};