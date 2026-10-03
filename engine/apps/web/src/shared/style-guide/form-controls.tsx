'use client'

import { useState } from 'react'

import { Button, Checkbox, Input, Select, Textarea, TextLink } from '../ui'

import { Section } from './section'
import styles from './style-guide.module.css'

export function FormControls(): React.ReactElement {
  const [checkboxChecked, setCheckboxChecked] = useState(false)

  return (
    <>
      <Section id="sg-button" title="Button" note="Default, hover/focus, disabled, loading.">
        <div className={styles.row}>
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="quiet">Quiet</Button>
          <Button size="small">Small</Button>
          <Button disabled>Disabled</Button>
          <Button loading>Loading</Button>
          <Button href="/" variant="secondary">
            As link
          </Button>
        </div>
      </Section>

      <Section id="sg-text-link" title="Text link">
        <div className={styles.row}>
          <TextLink href="/">Default link</TextLink>
          <TextLink href="/" className={styles.link}>
            Hover/focus me
          </TextLink>
        </div>
      </Section>

      <Section id="sg-input" title="Input">
        <div className={styles.row}>
          <div className={styles.field}>
            <Input id="sg-input-default" label="Name" placeholder="Ada Lovelace" />
          </div>
          <div className={styles.field}>
            <Input
              id="sg-input-error"
              label="Email"
              type="email"
              hint="We will never share it"
              error="Add a valid email"
              value="not-an-email"
            />
          </div>
          <div className={styles.field}>
            <Input id="sg-input-disabled" label="Code" disabled value="IG-000001" />
          </div>
        </div>
      </Section>

      <Section id="sg-select" title="Select">
        <div className={styles.row}>
          <div className={styles.field}>
            <Select id="sg-select-default" label="Sort">
              <option>Newest</option>
              <option>Oldest</option>
            </Select>
          </div>
          <div className={styles.field}>
            <Select id="sg-select-error" label="Category" error="Pick one">
              <option value="">Choose…</option>
              <option value="map">Maps</option>
            </Select>
          </div>
        </div>
      </Section>

      <Section id="sg-textarea" title="Textarea">
        <div className={styles.row}>
          <div className={styles.field}>
            <Textarea id="sg-textarea-default" label="Message" hint="Short is fine" />
          </div>
          <div className={styles.field}>
            <Textarea
              id="sg-textarea-error"
              label="Notes"
              error="This field is required"
              value=""
            />
          </div>
        </div>
      </Section>

      <Section id="sg-checkbox" title="Checkbox">
        <div className={styles.row}>
          <Checkbox
            id="sg-checkbox-default"
            label="I agree"
            checked={checkboxChecked}
            onChange={() => setCheckboxChecked((prev) => !prev)}
          />
          <Checkbox id="sg-checkbox-error" label="Subscribe" error="Required" />
          <Checkbox id="sg-checkbox-disabled" label="Admin only" disabled checked />
        </div>
      </Section>
    </>
  )
}
