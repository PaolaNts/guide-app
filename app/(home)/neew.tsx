import { useState } from "react";
import { View } from "react-native";
import {
  Checkbox,
  CheckboxIndicator,
  CheckboxLabel,
  CheckboxIcon,
} from "@/components/ui/checkbox";
import { CheckIcon } from "@/components/ui/icon";

export default function TipoGuia() {
  const [tipos, setTipos] = useState({
    turistico: false,
    enoturismo: false,
    gastronomico: false,
    cultural: false,
  });

  function toggle(key: string) {
    setTipos((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <View style={{ gap: 12 }}>
      <Checkbox isChecked={tipos.turistico} onChange={() => toggle("turistico")}>
        <CheckboxIndicator>
          <CheckboxIcon as={CheckIcon} />
        </CheckboxIndicator>
        <CheckboxLabel>Turístico</CheckboxLabel>
      </Checkbox>

      <Checkbox isChecked={tipos.enoturismo} onChange={() => toggle("enoturismo")}>
        <CheckboxIndicator>
          <CheckboxIcon as={CheckIcon} />
        </CheckboxIndicator>
        <CheckboxLabel>Enoturismo</CheckboxLabel>
      </Checkbox>

      <Checkbox isChecked={tipos.gastronomico} onChange={() => toggle("gastronomico")}>
        <CheckboxIndicator>
          <CheckboxIcon as={CheckIcon} />
        </CheckboxIndicator>
        <CheckboxLabel>Gastronômico</CheckboxLabel>
      </Checkbox>

      <Checkbox isChecked={tipos.cultural} onChange={() => toggle("cultural")}>
        <CheckboxIndicator>
          <CheckboxIcon as={CheckIcon} />
        </CheckboxIndicator>
        <CheckboxLabel>Cultural</CheckboxLabel>
      </Checkbox>
    </View>
  );
}
