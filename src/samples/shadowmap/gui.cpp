#include "shadowmap_render.h"

#include "../../render/render_gui.h"

void SimpleShadowmapRender::SetupGUIElements()
{
  ImGui_ImplVulkan_NewFrame();
  ImGui_ImplGlfw_NewFrame();
  ImGui::NewFrame();
  {
//    ImGui::ShowDemoWindow();
    ImGui::Begin("Simple render settings");

    ImGui::ColorEdit3("Meshes base color", m_uniforms.baseColor.M, ImGuiColorEditFlags_PickerHueWheel | ImGuiColorEditFlags_NoInputs);
    ImGui::SliderFloat3("Light source position", m_uniforms.lightPos.M, -10.f, 10.f);

    ImGui::SliderFloat("Minimum terrain height", &pushConst2M.minHeight, 0.0f, pushConst2M.maxHeight);
    ImGui::SliderFloat("Maximum terrain height ", &pushConst2M.maxHeight, pushConst2M.minHeight, 6.f);

    ImGui::Text("\nNoise");
    ImGui::SliderFloat("Exctinction", &m_extinction, 0.0f, 1.f);
    ImGui::SliderFloat3("Scale", m_noiseScale.M, 0.0f, 10.f);
    ImGui::SliderFloat3("Bounds", m_semiAxes.M, 1.0f, 12.5f);

    ImGui::Text("Application average %.3f ms/frame (%.1f FPS)", 1000.0f / ImGui::GetIO().Framerate, ImGui::GetIO().Framerate);

    ImGui::NewLine();

    ImGui::TextColored(ImVec4(1.0f, 1.0f, 0.0f, 1.0f),"Press 'B' to recompile and reload shaders");
    ImGui::End();
  }

  // Rendering
  ImGui::Render();
}
