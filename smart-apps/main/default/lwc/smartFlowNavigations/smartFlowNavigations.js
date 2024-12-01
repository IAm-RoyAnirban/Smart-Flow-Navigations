/**
 * @author            : Anirban Roy
 * @created on        : 05-19-2023
 * @last modified on  : 28-11-2024
 * @description       : Smart Flow Navigation Buttons
**/

import { LightningElement, api, track } from 'lwc';
import { FlowAttributeChangeEvent, FlowNavigationBackEvent, FlowNavigationNextEvent, FlowNavigationFinishEvent } from 'lightning/flowSupport';

const availableVariants = [
    { input: 'neutral', value: 'neutral' },
    { input: 'blue', value: 'brand' },
    { input: 'blue outlined', value: 'brand-outline' },
    { input: 'green', value: 'success' },
    { input: 'red', value: 'destructive' },
    { input: 'red outlined', value: 'destructive-text' }
];

const availableLayoutAlignments = [
    { input: 'left', value: 'flex_start' },
    { input: 'center', value: 'flex_center' },
    { input: 'right', value: 'flex_end', default: true }
];

const availableIconAlignments = [
    { input: 'right', value: 'right' },
    { input: 'left', value: 'left', default: true }
];

export default class SmartFlowNavigations extends LightningElement {
    @api buttonsList = '[{"label":"Previous","isNextAction":false,"variant":"neutral","outputValue":"Previous","icon":"utility:chevronleft","iconAlignment":"left","hideWhenUnavailable":true},{"label":"Next","isNextAction":true,"variant":"#1565C0","outputValue":"Next","icon":"utility:chevronright","iconColor":"#fff","labelColor":"#fff","iconAlignment":"right","hideWhenUnavailable":false}]';
    @api layoutAlignment = 'right';
    @api includeLine = false;
    @api outputValue;
    @api availableActions = [];
    @track finalButtons;
    @track errorMsg;

    connectedCallback() {
        this.validateJson()
            .then(() => this.validateAttributes())
            .catch((error) => {
                this.errorMsg = error;
            });
    }

    handleButtonClick(event) {
        this.outputValue = event.target.value;
        const isNextAction = event.target.dataset.isNextAction === 'true';

        if (isNextAction) {
            if (this.availableActions.includes('FINISH')) {
                this.dispatchEvent(new FlowNavigationFinishEvent());
            }
            else if (this.availableActions.includes('NEXT')) {
                this.dispatchEvent(new FlowNavigationNextEvent());
            }
        }
        else {
            if (this.availableActions.includes('BACK')) {
                this.dispatchEvent(new FlowNavigationBackEvent());
            }
        }

        this.dispatchEvent(new FlowAttributeChangeEvent('outputValue', this.outputValue));
    }

    validateAttributes() {
        return new Promise((resolve, reject) => {
            // Check if buttonsList is neither an object nor an array
            if (!Array.isArray(this.buttonsList)) {
                reject('Please provide a valid list of buttons. It should be an array.');
            }
            else if (this.buttonsList.length == 0) {
                //reject('Please add at least one button detail to the buttons list.');
                resolve(); return;
            }

            if (!this.layoutAlignment || this.layoutAlignment.trim() === '') {
                reject(`Button layout alignment is not defined. Please provide a valid layout alignment (e.g., 'left', 'right', or 'center').`);
            }
            else {
                const matchingLayout =
                    availableLayoutAlignments.find(layout => layout.input === this.layoutAlignment.trim().toLowerCase());

                if (matchingLayout) {
                    this.layoutAlignment = matchingLayout.value;
                }
                else {
                    reject(`'${this.layoutAlignment}' is not a valid button layout alignment. Please provide a valid button alignment (e.g., 'left', 'right', or 'center').`);
                }
            }

            for (let i = 0; i < this.buttonsList.length; i++) {
                let button = this.buttonsList[i];
                if (!button.label || button.label.trim() === '' || !button.variant || button.variant.trim() === '') {
                    reject('Please provide a valid label and variant for each button.');
                    return;
                }
                button.label = button.label.trim();
                button.variant = button.variant.trim();

                if (button.icon) {
                    if (!button.iconAlignment || button.iconAlignment.trim() === '') {
                        reject(`'iconAlignment' attribute is required when an 'icon' is specified.`);
                        return;
                    }
                    else {
                        button.iconAlignment = button.iconAlignment.trim().toLowerCase();
                    }

                    if (!this.isValidIconAlignment(button.iconAlignment)) {
                        reject(`'${button.iconAlignment}' is not a valid alignment. Please provide a valid alignment (e.g., 'left' or 'right').`);
                        return;
                    }
                }

                if (this.isValidHex(button.variant)) {
                    if (button.labelColor) {
                        if (!this.isValidHex(button.labelColor)) {
                            reject(`'${button.labelColor}' is not a valid hex color. Please provide a valid hex color (e.g., '#RRGGBB').`);
                            return;
                        }
                    }
                    else {
                        button.labelColor = '#fff';
                    }

                    if (button.iconColor) {
                        if (!this.isValidHex(button.iconColor)) {
                            reject(`'${button.iconColor}' is not a valid hex color. Please provide a valid hex color (e.g., '#RRGGBB').`);
                            return;
                        }
                    }
                    else {
                        button.iconColor = '#fff';
                    }
                    button.style = `--slds-c-button-brand-color-background: ${button.variant}; --slds-c-button-brand-color-background-hover: ${button.variant}; --slds-c-button-brand-color-background-active: ${button.variant}; --slds-c-button-brand-color-border: ${button.variant}; --slds-c-button-brand-color-border-hover: ${button.variant}; --slds-c-button-brand-text-color: ${button.labelColor}; --slds-c-button-brand-text-color-hover: ${button.labelColor}; --slds-c-button-brand-text-color-active: ${button.labelColor}; --slds-c-icon-color-foreground: ${button.iconColor}`;
                }
                else if (this.isValidVariant(button.variant)) {
                    button.variant = availableVariants.find(variant => variant.input === button.variant.trim().toLowerCase())?.value;
                }
                else {
                    reject(`'${button.variant}' is not a valid variant or hex color. Please provide a valid hex color (e.g., '#RRGGBB').`);
                    return;
                }

                if (button.outputValue) {
                    button.outputValue = button.outputValue.trim();
                }
                else {
                    button.outputValue = button.label.trim();
                }

                button.isDisabled = button.isNextAction === true ? this.hasNextAction() : this.hasBackAction();

                if (button.hideWhenUnavailable && button.isDisabled) {
                    this.buttonsList.splice(i, 1);
                    i--;    // Decreased the index to account for the removed item, so we don't skip the next button
                }
            }

            this.finalButtons = this.buttonsList;
            resolve();
        });
    }



    hasNextAction() {
        return !(this.availableActions.includes('NEXT') || this.availableActions.includes('FINISH'));
    }

    hasBackAction() {
        return !(this.availableActions.includes('BACK'));
    }

    isValidIconAlignment(alignmentValue) {
        return availableIconAlignments.some(alignment => alignment.input === alignmentValue);
    }

    isValidVariant(variantValue) {
        return availableVariants.some(variant => variant.input === variantValue.trim().toLowerCase());
    }

    isValidHex(value) {
        var reg = /^#([0-9a-f]{3}){1,2}$/i;
        return reg.test(value);
    }

    validateJson() {
        return new Promise((resolve, reject) => {
            try {
                this.buttonsList = JSON.parse(this.buttonsList);

                this.buttonsList.forEach(button => {
                    Object.keys(button).forEach(key => {
                        if (Number.isInteger(button[key])) {
                            button[key] = button[key].toString();
                        }
                    });
                });
                resolve();
            }
            catch (error) {
                reject('The buttons list seems to be in the wrong format. Please check the structure and try again.');
            }
        });
    }
}